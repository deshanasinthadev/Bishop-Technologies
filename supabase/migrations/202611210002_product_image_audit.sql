begin;

create trigger audit_product_images
after insert or update or delete on bishop_private.product_images
for each row execute function bishop_private.audit('product_id');

commit;
