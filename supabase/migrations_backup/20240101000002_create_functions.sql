create or replace function prt_sync_reset_token() returns trigger
  language plpgsql
as $$
begin
  if new.reset_token is null then
    new.reset_token := new.token;
  end if;
  return new;
end
$$;

create or replace function update_updated_at_column() returns trigger
  language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

