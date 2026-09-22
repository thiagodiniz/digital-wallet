-- Digital wallet schema: one account per auth user, append-only ledger,
-- balance maintained atomically by post_transaction().

create type public.transaction_type as enum ('deposit', 'withdrawal', 'transfer_in', 'transfer_out');

create table public.accounts (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null unique references auth.users (id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  created_at    timestamptz not null default now()
);

create table public.transactions (
  id                      uuid primary key default gen_random_uuid(),
  account_id              uuid not null references public.accounts (id) on delete cascade,
  type                    public.transaction_type not null,
  -- signed: credits positive, debits negative
  amount_cents            bigint not null check (amount_cents <> 0),
  description             text,
  counterparty_account_id uuid references public.accounts (id),
  reference_id            text,
  created_at              timestamptz not null default now(),
  constraint transactions_sign_matches_type check (
    (type in ('deposit', 'transfer_in') and amount_cents > 0)
    or (type in ('withdrawal', 'transfer_out') and amount_cents < 0)
  )
);

create unique index transactions_reference_id_key
  on public.transactions (account_id, reference_id)
  where reference_id is not null;

create index transactions_account_created_idx
  on public.transactions (account_id, created_at desc);

-- Every new auth user gets a wallet account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (owner_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomically applies a ledger entry and updates the cached balance.
-- p_amount_cents is the absolute amount; sign is derived from p_type.
create or replace function public.post_transaction(
  p_account_id uuid,
  p_type public.transaction_type,
  p_amount_cents bigint,
  p_description text default null,
  p_counterparty_account_id uuid default null,
  p_reference_id text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signed   bigint;
  v_balance  bigint;
  v_tx       public.transactions;
begin
  if p_amount_cents <= 0 then
    raise exception 'amount must be positive';
  end if;

  v_signed := case when p_type in ('deposit', 'transfer_in') then p_amount_cents else -p_amount_cents end;

  select balance_cents into v_balance
  from public.accounts
  where id = p_account_id
  for update;

  if not found then
    raise exception 'account not found';
  end if;

  if v_balance + v_signed < 0 then
    raise exception 'insufficient funds' using errcode = '23514';
  end if;

  insert into public.transactions (account_id, type, amount_cents, description, counterparty_account_id, reference_id)
  values (p_account_id, p_type, v_signed, p_description, p_counterparty_account_id, p_reference_id)
  returning * into v_tx;

  update public.accounts set balance_cents = balance_cents + v_signed where id = p_account_id;

  return v_tx;
end;
$$;

-- Row level security: users read their own data; writes only through the API (service role).
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;

create policy "accounts: owner can read"
  on public.accounts for select
  using (auth.uid() = owner_id);

create policy "transactions: owner can read"
  on public.transactions for select
  using (exists (
    select 1 from public.accounts a where a.id = transactions.account_id and a.owner_id = auth.uid()
  ));

revoke execute on function public.post_transaction from public, anon, authenticated;
grant execute on function public.post_transaction to service_role;
