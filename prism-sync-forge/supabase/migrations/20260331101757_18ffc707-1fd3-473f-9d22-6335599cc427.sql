
ALTER TABLE user_roles DROP CONSTRAINT user_roles_user_id_fkey;
ALTER TABLE time_logs DROP CONSTRAINT time_logs_user_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT invoices_user_id_fkey;
ALTER TABLE payrolls DROP CONSTRAINT payrolls_user_id_fkey;
ALTER TABLE attendances DROP CONSTRAINT attendances_user_id_fkey;
ALTER TABLE performance_appraisals DROP CONSTRAINT performance_appraisals_user_id_fkey;
