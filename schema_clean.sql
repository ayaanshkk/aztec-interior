


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."assignment_type_enum" AS ENUM (
    'job',
    'off',
    'delivery',
    'note'
);


ALTER TYPE "public"."assignment_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."audit_action_enum" AS ENUM (
    'create',
    'update',
    'delete'
);


ALTER TYPE "public"."audit_action_enum" OWNER TO "postgres";


CREATE TYPE "public"."checklist_template_enum" AS ENUM (
    'BedroomChecklist',
    'KitchenChecklist',
    'PaymentTerms',
    'CustomerSatisfaction',
    'RemedialAction',
    'PromotionalOffer'
);


ALTER TYPE "public"."checklist_template_enum" OWNER TO "postgres";


CREATE TYPE "public"."contact_made_enum" AS ENUM (
    'Yes',
    'No',
    'Unknown'
);


ALTER TYPE "public"."contact_made_enum" OWNER TO "postgres";


CREATE TYPE "public"."counting_status_enum" AS ENUM (
    'Draft',
    'Finalised'
);


ALTER TYPE "public"."counting_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."counting_template_enum" AS ENUM (
    'KitchenCountingSheet',
    'BedCountingSheet'
);


ALTER TYPE "public"."counting_template_enum" OWNER TO "postgres";


CREATE TYPE "public"."document_template_type_enum" AS ENUM (
    'Invoice',
    'Receipt',
    'Quotation',
    'Warranty',
    'Terms',
    'Other'
);


ALTER TYPE "public"."document_template_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."job_stage_enum" AS ENUM (
    'Lead',
    'Quote',
    'Consultation',
    'Survey',
    'Measure',
    'Design',
    'Quoted',
    'Accepted',
    'Rejected',
    'Ordered',
    'Production',
    'Delivery',
    'Installation',
    'Complete',
    'Remedial',
    'Cancelled'
);


ALTER TYPE "public"."job_stage_enum" OWNER TO "postgres";


CREATE TYPE "public"."job_stage_enum_new" AS ENUM (
    'Lead',
    'Quote',
    'Consultation',
    'Survey',
    'Measure',
    'Design',
    'Quoted',
    'Accepted',
    'Rejected',
    'Ordered',
    'Production',
    'Delivery',
    'Installation',
    'Complete',
    'Remedial',
    'Cancelled'
);


ALTER TYPE "public"."job_stage_enum_new" OWNER TO "postgres";


CREATE TYPE "public"."job_type_enum" AS ENUM (
    'Kitchen',
    'Bedroom',
    'Wardrobe',
    'Remedial',
    'Other'
);


ALTER TYPE "public"."job_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."job_work_stage_enum" AS ENUM (
    'Survey',
    'Delivery',
    'Installation'
);


ALTER TYPE "public"."job_work_stage_enum" OWNER TO "postgres";


CREATE TYPE "public"."material_status" AS ENUM (
    'not_ordered',
    'ordered',
    'in_transit',
    'delivered',
    'delayed'
);


ALTER TYPE "public"."material_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_method_enum" AS ENUM (
    'BACS',
    'Cash',
    'Card',
    'Other'
);


ALTER TYPE "public"."payment_method_enum" OWNER TO "postgres";


CREATE TYPE "public"."preferred_contact_enum" AS ENUM (
    'Phone',
    'Email',
    'WhatsApp'
);


ALTER TYPE "public"."preferred_contact_enum" OWNER TO "postgres";


CREATE TYPE "public"."remedial_status_enum" AS ENUM (
    'Submitted',
    'Reviewed',
    'Actioned'
);


ALTER TYPE "public"."remedial_status_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_material_orders_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_material_orders_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."action_items" (
    "id" character varying NOT NULL,
    "customer_id" character varying NOT NULL,
    "stage" character varying NOT NULL,
    "priority" character varying,
    "completed" boolean,
    "created_at" timestamp without time zone,
    "completed_at" timestamp without time zone
);


ALTER TABLE "public"."action_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appliance_categories" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "active" boolean,
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."appliance_categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."appliance_categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."appliance_categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."appliance_categories_id_seq" OWNED BY "public"."appliance_categories"."id";



CREATE TABLE IF NOT EXISTS "public"."approval_notifications" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "document_type" character varying(50) NOT NULL,
    "document_id" integer NOT NULL,
    "status" character varying(20),
    "message" "text" NOT NULL,
    "created_at" timestamp without time zone,
    "is_read" boolean
);


ALTER TABLE "public"."approval_notifications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."approval_notifications_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."approval_notifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."approval_notifications_id_seq" OWNED BY "public"."approval_notifications"."id";



CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" character varying(36) NOT NULL,
    "type" "public"."assignment_type_enum" NOT NULL,
    "title" character varying(255) NOT NULL,
    "date" "date" NOT NULL,
    "user_id" integer,
    "team_member" character varying(200),
    "created_by" integer,
    "job_id" character varying(36),
    "customer_id" character varying(36),
    "start_time" time without time zone,
    "end_time" time without time zone,
    "estimated_hours" double precision,
    "notes" "text",
    "priority" character varying(20),
    "status" character varying(20),
    "created_at" timestamp without time zone,
    "updated_by" integer,
    "updated_at" timestamp without time zone,
    "job_type" character varying(100),
    "created_by_name" character varying(200),
    "updated_by_name" character varying(200),
    "start_date" "date",
    "end_date" "date",
    "customer_name" character varying(200)
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" integer NOT NULL,
    "entity_type" character varying(120) NOT NULL,
    "entity_id" character varying(120) NOT NULL,
    "action" "public"."audit_action_enum" NOT NULL,
    "changed_by" character varying(200),
    "changed_at" timestamp without time zone,
    "change_summary" json,
    "previous_snapshot" json,
    "new_snapshot" json
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "logo_url" character varying(255),
    "website" character varying(255),
    "active" boolean,
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."brands" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."brands_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."brands_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."brands_id_seq" OWNED BY "public"."brands"."id";



CREATE TABLE IF NOT EXISTS "public"."checklist_items" (
    "id" integer NOT NULL,
    "checklist_id" integer NOT NULL,
    "text" character varying(255) NOT NULL,
    "checked" boolean,
    "order_index" integer
);


ALTER TABLE "public"."checklist_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."checklist_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."checklist_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."checklist_items_id_seq" OWNED BY "public"."checklist_items"."id";



CREATE TABLE IF NOT EXISTS "public"."counting_items" (
    "id" integer NOT NULL,
    "sheet_id" integer NOT NULL,
    "description" character varying(255) NOT NULL,
    "quantity_requested" integer,
    "quantity_ordered" integer,
    "quantity_counted" integer,
    "unit" character varying(50),
    "supplier" character varying(120),
    "customer_supplied" boolean,
    "notes" "text"
);


ALTER TABLE "public"."counting_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."counting_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."counting_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."counting_items_id_seq" OWNED BY "public"."counting_items"."id";



CREATE TABLE IF NOT EXISTS "public"."counting_sheets" (
    "id" integer NOT NULL,
    "job_id" character varying(36) NOT NULL,
    "room_id" integer,
    "template_type" "public"."counting_template_enum" NOT NULL,
    "status" "public"."counting_status_enum",
    "created_by" character varying(200),
    "created_at" timestamp without time zone,
    "updated_by" character varying(200),
    "updated_at" timestamp without time zone
);


ALTER TABLE "public"."counting_sheets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."counting_sheets_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."counting_sheets_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."counting_sheets_id_seq" OWNED BY "public"."counting_sheets"."id";



CREATE TABLE IF NOT EXISTS "public"."customer_form_data" (
    "id" integer NOT NULL,
    "customer_id" character varying(36) NOT NULL,
    "project_id" character varying(36),
    "form_data" "text" NOT NULL,
    "token_used" character varying(64),
    "submitted_at" timestamp without time zone,
    "approval_status" character varying(20),
    "approved_by" integer,
    "approval_date" timestamp without time zone,
    "rejection_reason" "text",
    "created_by" integer,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."customer_form_data" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."customer_form_data_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."customer_form_data_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."customer_form_data_id_seq" OWNED BY "public"."customer_form_data"."id";



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" character varying(36) NOT NULL,
    "date_of_measure" "date",
    "name" character varying(200) NOT NULL,
    "address" "text",
    "postcode" character varying(20),
    "phone" character varying(50),
    "email" character varying(200),
    "contact_made" "public"."contact_made_enum",
    "preferred_contact_method" "public"."preferred_contact_enum",
    "marketing_opt_in" boolean,
    "notes" "text",
    "project_types" json,
    "salesperson" character varying(200),
    "created_by" character varying(200),
    "created_at" timestamp without time zone,
    "updated_by" character varying(200),
    "updated_at" timestamp without time zone,
    "status" character varying(50),
    "user_id" "uuid",
    "stage" "public"."job_stage_enum" DEFAULT 'Lead'::"public"."job_stage_enum"
);

ALTER TABLE ONLY "public"."customers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_imports" (
    "id" integer NOT NULL,
    "filename" character varying(255) NOT NULL,
    "import_type" character varying(50) NOT NULL,
    "status" character varying(20),
    "records_processed" integer,
    "records_failed" integer,
    "error_log" "text",
    "imported_by" character varying(200),
    "created_at" timestamp without time zone,
    "completed_at" timestamp without time zone
);


ALTER TABLE "public"."data_imports" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."data_imports_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."data_imports_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."data_imports_id_seq" OWNED BY "public"."data_imports"."id";



CREATE TABLE IF NOT EXISTS "public"."document_templates" (
    "id" integer NOT NULL,
    "name" character varying(120) NOT NULL,
    "template_type" "public"."document_template_type_enum" NOT NULL,
    "file_path" character varying(500) NOT NULL,
    "merge_fields" json,
    "uploaded_by" character varying(200),
    "uploaded_at" timestamp without time zone
);


ALTER TABLE "public"."document_templates" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."document_templates_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."document_templates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."document_templates_id_seq" OWNED BY "public"."document_templates"."id";



CREATE TABLE IF NOT EXISTS "public"."drawing_documents" (
    "id" character varying(36) NOT NULL,
    "customer_id" character varying(36) NOT NULL,
    "project_id" character varying(36),
    "file_name" character varying(255) NOT NULL,
    "storage_path" character varying(500) NOT NULL,
    "file_url" character varying(500) NOT NULL,
    "mime_type" character varying(100),
    "category" character varying(50),
    "uploaded_by" character varying(200),
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."drawing_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fitters" (
    "id" integer NOT NULL,
    "name" character varying(200) NOT NULL,
    "team_id" integer,
    "skills" "text",
    "active" boolean,
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."fitters" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."fitters_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."fitters_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."fitters_id_seq" OWNED BY "public"."fitters"."id";



CREATE TABLE IF NOT EXISTS "public"."form_documents" (
    "id" character varying(36) NOT NULL,
    "customer_id" character varying(36) NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "storage_path" character varying(500) NOT NULL,
    "file_url" character varying(500) NOT NULL,
    "mime_type" character varying(100),
    "category" character varying(50) DEFAULT 'form'::character varying,
    "uploaded_by" character varying(200),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."form_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."form_submissions" (
    "id" integer NOT NULL,
    "customer_id" character varying(36),
    "form_data" "text" NOT NULL,
    "source" character varying(100),
    "submitted_at" timestamp without time zone,
    "processed" boolean,
    "processed_at" timestamp without time zone
);


ALTER TABLE "public"."form_submissions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."form_submissions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."form_submissions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."form_submissions_id_seq" OWNED BY "public"."form_submissions"."id";



CREATE TABLE IF NOT EXISTS "public"."invoice_line_items" (
    "id" integer NOT NULL,
    "invoice_id" integer NOT NULL,
    "description" character varying(255) NOT NULL,
    "quantity" integer,
    "unit_price" numeric(10,2) NOT NULL,
    "vat_rate" numeric(5,2)
);


ALTER TABLE "public"."invoice_line_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."invoice_line_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."invoice_line_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."invoice_line_items_id_seq" OWNED BY "public"."invoice_line_items"."id";



CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" integer NOT NULL,
    "job_id" character varying(36) NOT NULL,
    "invoice_number" character varying(50) NOT NULL,
    "status" character varying(20),
    "due_date" "date",
    "paid_date" "date",
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."invoices_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."invoices_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."invoices_id_seq" OWNED BY "public"."invoices"."id";



CREATE TABLE IF NOT EXISTS "public"."job_checklists" (
    "id" integer NOT NULL,
    "job_id" character varying(36) NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "template_type" "public"."checklist_template_enum",
    "template_version" integer,
    "status" character varying(20),
    "filled_by" character varying(200),
    "filled_at" timestamp without time zone,
    "fields" json,
    "signed" boolean,
    "signature_path" character varying(500),
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
);


ALTER TABLE "public"."job_checklists" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."job_checklists_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."job_checklists_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."job_checklists_id_seq" OWNED BY "public"."job_checklists"."id";



CREATE TABLE IF NOT EXISTS "public"."job_documents" (
    "id" integer NOT NULL,
    "job_id" character varying(36) NOT NULL,
    "filename" character varying(255) NOT NULL,
    "original_filename" character varying(255) NOT NULL,
    "file_path" character varying(500) NOT NULL,
    "file_size" integer,
    "mime_type" character varying(100),
    "category" character varying(50),
    "uploaded_by" character varying(200),
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."job_documents" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."job_documents_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."job_documents_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."job_documents_id_seq" OWNED BY "public"."job_documents"."id";



CREATE TABLE IF NOT EXISTS "public"."job_form_links" (
    "id" integer NOT NULL,
    "job_id" character varying(36) NOT NULL,
    "form_submission_id" integer NOT NULL,
    "linked_at" timestamp without time zone,
    "linked_by" character varying(200)
);


ALTER TABLE "public"."job_form_links" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."job_form_links_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."job_form_links_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."job_form_links_id_seq" OWNED BY "public"."job_form_links"."id";



CREATE TABLE IF NOT EXISTS "public"."job_notes" (
    "id" integer NOT NULL,
    "job_id" character varying(36) NOT NULL,
    "content" "text" NOT NULL,
    "note_type" character varying(50),
    "author" character varying(200),
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."job_notes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."job_notes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."job_notes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."job_notes_id_seq" OWNED BY "public"."job_notes"."id";



CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" character varying(36) NOT NULL,
    "customer_id" character varying(36) NOT NULL,
    "job_reference" character varying(100),
    "job_name" character varying(200),
    "job_type" "public"."job_type_enum" NOT NULL,
    "stage" "public"."job_stage_enum" DEFAULT 'Lead'::"public"."job_stage_enum" NOT NULL,
    "priority" character varying(20),
    "quote_price" numeric(10,2),
    "agreed_price" numeric(10,2),
    "sold_amount" numeric(10,2),
    "deposit1" numeric(10,2),
    "deposit2" numeric(10,2),
    "delivery_date" timestamp without time zone,
    "measure_date" timestamp without time zone,
    "completion_date" timestamp without time zone,
    "deposit_due_date" timestamp without time zone,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "installation_address" "text",
    "notes" "text",
    "salesperson_name" character varying(100),
    "assigned_team_name" character varying(100),
    "primary_fitter_name" character varying(100),
    "assigned_team_id" integer,
    "primary_fitter_id" integer,
    "salesperson_id" integer,
    "quote_id" integer,
    "has_counting_sheet" boolean,
    "has_schedule" boolean,
    "has_invoice" boolean,
    "work_stage" "public"."job_work_stage_enum" DEFAULT 'Survey'::"public"."job_work_stage_enum"
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."login_attempts" (
    "id" integer NOT NULL,
    "email" character varying(120) NOT NULL,
    "ip_address" character varying(45) NOT NULL,
    "success" boolean,
    "attempted_at" timestamp without time zone
);

ALTER TABLE ONLY "public"."login_attempts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."login_attempts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."login_attempts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."login_attempts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."login_attempts_id_seq" OWNED BY "public"."login_attempts"."id";



CREATE TABLE IF NOT EXISTS "public"."material_change_logs" (
    "id" character varying(36) NOT NULL,
    "material_order_id" character varying(36) NOT NULL,
    "changed_by_user_id" integer NOT NULL,
    "change_type" character varying(50) NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "change_description" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."material_change_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_orders" (
    "id" character varying(36) NOT NULL,
    "customer_id" character varying(36) NOT NULL,
    "job_id" character varying(36),
    "project_id" integer,
    "ordered_by_user_id" integer,
    "material_description" "text" NOT NULL,
    "supplier_name" character varying(255),
    "supplier_reference" character varying(100),
    "status" "public"."material_status" DEFAULT 'not_ordered'::"public"."material_status" NOT NULL,
    "order_date" timestamp without time zone,
    "expected_delivery_date" timestamp without time zone,
    "actual_delivery_date" timestamp without time zone,
    "estimated_cost" numeric(10,2),
    "actual_cost" numeric(10,2),
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."material_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" integer NOT NULL,
    "job_id" character varying(36) NOT NULL,
    "invoice_id" integer,
    "date" "date",
    "amount" numeric(10,2) NOT NULL,
    "method" "public"."payment_method_enum",
    "reference" character varying(120),
    "bank_details_used" character varying(255),
    "notes" "text",
    "cleared" boolean,
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payments_id_seq" OWNED BY "public"."payments"."id";



CREATE TABLE IF NOT EXISTS "public"."product_quote_items" (
    "id" integer NOT NULL,
    "quotation_id" integer NOT NULL,
    "product_id" integer NOT NULL,
    "quantity" integer,
    "quoted_price" numeric(10,2) NOT NULL,
    "tier_used" character varying(10),
    "selected_color" character varying(50),
    "custom_notes" "text",
    "line_total" numeric(10,2),
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."product_quote_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."product_quote_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."product_quote_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."product_quote_items_id_seq" OWNED BY "public"."product_quote_items"."id";



CREATE TABLE IF NOT EXISTS "public"."production_notifications" (
    "id" character varying(36) NOT NULL,
    "job_id" character varying(36),
    "customer_id" character varying(36),
    "message" "text" NOT NULL,
    "created_at" timestamp without time zone,
    "read" boolean,
    "moved_by" character varying(255),
    "form_submission_id" integer,
    "form_type" character varying(50),
    "checklist_id" character varying(50),
    "user_id" integer NOT NULL,
    "dismissed" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."production_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" integer NOT NULL,
    "brand_id" integer NOT NULL,
    "category_id" integer NOT NULL,
    "model_code" character varying(100) NOT NULL,
    "series" character varying(100),
    "name" character varying(200) NOT NULL,
    "description" "text",
    "base_price" numeric(10,2),
    "low_tier_price" numeric(10,2),
    "mid_tier_price" numeric(10,2),
    "high_tier_price" numeric(10,2),
    "dimensions" "text",
    "weight" numeric(8,2),
    "color_options" "text",
    "pack_name" character varying(200),
    "notes" "text",
    "energy_rating" character varying(10),
    "warranty_years" integer,
    "active" boolean,
    "in_stock" boolean,
    "lead_time_weeks" integer,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."products_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."products_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."products_id_seq" OWNED BY "public"."products"."id";



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" character varying(36) NOT NULL,
    "customer_id" character varying(36) NOT NULL,
    "project_name" character varying(200) NOT NULL,
    "project_type" "public"."job_type_enum" NOT NULL,
    "date_of_measure" "date",
    "notes" "text",
    "created_by" character varying(200),
    "created_at" timestamp without time zone,
    "updated_by" character varying(200),
    "updated_at" timestamp without time zone,
    "stage" "public"."job_stage_enum"
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotation_items" (
    "id" integer NOT NULL,
    "quotation_id" integer NOT NULL,
    "item" character varying(100) NOT NULL,
    "description" "text",
    "color" character varying(50),
    "amount" double precision NOT NULL
);


ALTER TABLE "public"."quotation_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."quotation_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quotation_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quotation_items_id_seq" OWNED BY "public"."quotation_items"."id";



CREATE TABLE IF NOT EXISTS "public"."quotations" (
    "id" integer NOT NULL,
    "customer_id" character varying(36) NOT NULL,
    "reference_number" character varying(50),
    "total" numeric(10,2) NOT NULL,
    "status" character varying(20),
    "valid_until" "date",
    "notes" "text",
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
);


ALTER TABLE "public"."quotations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."quotations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quotations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quotations_id_seq" OWNED BY "public"."quotations"."id";



CREATE TABLE IF NOT EXISTS "public"."remedial_actions" (
    "id" integer NOT NULL,
    "job_id" character varying(36) NOT NULL,
    "date" "date",
    "assigned_to" character varying(200),
    "status" "public"."remedial_status_enum",
    "notes" "text",
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."remedial_actions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."remedial_actions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."remedial_actions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."remedial_actions_id_seq" OWNED BY "public"."remedial_actions"."id";



CREATE TABLE IF NOT EXISTS "public"."remedial_items" (
    "id" integer NOT NULL,
    "remedial_id" integer NOT NULL,
    "number" integer,
    "item" character varying(120),
    "remedial_action" character varying(255),
    "colour" character varying(50),
    "size" character varying(50),
    "quantity" integer,
    "status" character varying(50)
);


ALTER TABLE "public"."remedial_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."remedial_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."remedial_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."remedial_items_id_seq" OWNED BY "public"."remedial_items"."id";



CREATE TABLE IF NOT EXISTS "public"."room_appliances" (
    "id" integer NOT NULL,
    "room_id" integer NOT NULL,
    "appliance_type" character varying(100) NOT NULL,
    "brand" character varying(100),
    "model" character varying(100),
    "specifications" "text",
    "installation_notes" "text",
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."room_appliances" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."room_appliances_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."room_appliances_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."room_appliances_id_seq" OWNED BY "public"."room_appliances"."id";



CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" integer NOT NULL,
    "job_id" character varying(36) NOT NULL,
    "name" character varying(100) NOT NULL,
    "room_type" character varying(50) NOT NULL,
    "measurements" "text",
    "notes" "text",
    "order_index" integer,
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."rooms_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."rooms_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."rooms_id_seq" OWNED BY "public"."rooms"."id";



CREATE TABLE IF NOT EXISTS "public"."salespeople" (
    "id" integer NOT NULL,
    "name" character varying(200) NOT NULL,
    "email" character varying(120),
    "phone" character varying(20),
    "active" boolean,
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."salespeople" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."salespeople_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."salespeople_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."salespeople_id_seq" OWNED BY "public"."salespeople"."id";



CREATE TABLE IF NOT EXISTS "public"."schedule_items" (
    "id" integer NOT NULL,
    "job_id" character varying(36) NOT NULL,
    "title" character varying(200) NOT NULL,
    "description" "text",
    "start_date" timestamp without time zone NOT NULL,
    "end_date" timestamp without time zone,
    "all_day" boolean,
    "status" character varying(20),
    "assigned_team_id" integer,
    "assigned_fitter_id" integer,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone
);


ALTER TABLE "public"."schedule_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."schedule_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."schedule_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."schedule_items_id_seq" OWNED BY "public"."schedule_items"."id";



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" integer NOT NULL,
    "name" character varying(200) NOT NULL,
    "specialty" character varying(100),
    "active" boolean,
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."teams_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."teams_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."teams_id_seq" OWNED BY "public"."teams"."id";



CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "session_token" character varying(255) NOT NULL,
    "ip_address" character varying(45),
    "user_agent" "text",
    "expires_at" timestamp without time zone NOT NULL,
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_sessions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_sessions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_sessions_id_seq" OWNED BY "public"."user_sessions"."id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" integer NOT NULL,
    "email" character varying(120) NOT NULL,
    "password_hash" character varying(255),
    "first_name" character varying(50) NOT NULL,
    "last_name" character varying(50) NOT NULL,
    "phone" character varying(20),
    "role" character varying(20),
    "department" character varying(50),
    "is_active" boolean,
    "is_verified" boolean,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "last_login" timestamp without time zone,
    "reset_token" character varying(100),
    "reset_token_expires" timestamp without time zone,
    "verification_token" character varying(100),
    "is_invited" boolean DEFAULT false NOT NULL,
    "invitation_token" character varying(100),
    "invited_at" timestamp without time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."users_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."users_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."users_id_seq" OWNED BY "public"."users"."id";



CREATE OR REPLACE VIEW "public"."v_materials_dashboard" AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."material_orders"
          WHERE ("material_orders"."status" = 'not_ordered'::"public"."material_status")) AS "not_ordered_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."material_orders"
          WHERE ("material_orders"."status" = 'ordered'::"public"."material_status")) AS "ordered_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."material_orders"
          WHERE ("material_orders"."status" = 'in_transit'::"public"."material_status")) AS "in_transit_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."material_orders"
          WHERE ("material_orders"."status" = 'delivered'::"public"."material_status")) AS "delivered_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."material_orders"
          WHERE ("material_orders"."status" = 'delayed'::"public"."material_status")) AS "delayed_count",
    ( SELECT COALESCE("sum"("material_orders"."estimated_cost"), (0)::numeric) AS "coalesce"
           FROM "public"."material_orders"
          WHERE ("material_orders"."status" <> 'delivered'::"public"."material_status")) AS "pending_value",
    ( SELECT COALESCE("sum"("material_orders"."actual_cost"), (0)::numeric) AS "coalesce"
           FROM "public"."material_orders"
          WHERE ("material_orders"."status" = 'delivered'::"public"."material_status")) AS "delivered_value",
    ( SELECT "count"(*) AS "count"
           FROM "public"."material_orders"
          WHERE ((("material_orders"."expected_delivery_date" >= CURRENT_TIMESTAMP) AND ("material_orders"."expected_delivery_date" <= (CURRENT_TIMESTAMP + '7 days'::interval))) AND ("material_orders"."status" = ANY (ARRAY['ordered'::"public"."material_status", 'in_transit'::"public"."material_status"])))) AS "deliveries_this_week";


ALTER VIEW "public"."v_materials_dashboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."versioned_snapshots" (
    "id" integer NOT NULL,
    "entity_type" character varying(120) NOT NULL,
    "entity_id" character varying(120) NOT NULL,
    "version_number" integer NOT NULL,
    "reason" character varying(255),
    "snapshot" json NOT NULL,
    "created_at" timestamp without time zone,
    "created_by" character varying(200)
);


ALTER TABLE "public"."versioned_snapshots" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."versioned_snapshots_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."versioned_snapshots_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."versioned_snapshots_id_seq" OWNED BY "public"."versioned_snapshots"."id";



ALTER TABLE ONLY "public"."appliance_categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."appliance_categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."approval_notifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."approval_notifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."brands" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."brands_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."checklist_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."checklist_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."counting_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."counting_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."counting_sheets" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."counting_sheets_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."customer_form_data" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."customer_form_data_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."data_imports" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."data_imports_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."document_templates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."document_templates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."fitters" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."fitters_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."form_submissions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."form_submissions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."invoice_line_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."invoice_line_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."invoices" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."invoices_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."job_checklists" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."job_checklists_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."job_documents" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."job_documents_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."job_form_links" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."job_form_links_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."job_notes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."job_notes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."login_attempts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."login_attempts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."product_quote_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."product_quote_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."products" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."products_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quotation_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quotation_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quotations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quotations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."remedial_actions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."remedial_actions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."remedial_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."remedial_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."room_appliances" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."room_appliances_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."rooms" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."rooms_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."salespeople" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."salespeople_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."schedule_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."schedule_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."teams" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."teams_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_sessions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_sessions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."users_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."versioned_snapshots" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."versioned_snapshots_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."action_items"
    ADD CONSTRAINT "action_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appliance_categories"
    ADD CONSTRAINT "appliance_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."appliance_categories"
    ADD CONSTRAINT "appliance_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_notifications"
    ADD CONSTRAINT "approval_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_items"
    ADD CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."counting_items"
    ADD CONSTRAINT "counting_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."counting_sheets"
    ADD CONSTRAINT "counting_sheets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_form_data"
    ADD CONSTRAINT "customer_form_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_imports"
    ADD CONSTRAINT "data_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drawing_documents"
    ADD CONSTRAINT "drawing_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitters"
    ADD CONSTRAINT "fitters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_documents"
    ADD CONSTRAINT "form_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_checklists"
    ADD CONSTRAINT "job_checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_form_links"
    ADD CONSTRAINT "job_form_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_notes"
    ADD CONSTRAINT "job_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_job_reference_key" UNIQUE ("job_reference");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."login_attempts"
    ADD CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material_change_logs"
    ADD CONSTRAINT "material_change_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material_orders"
    ADD CONSTRAINT "material_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_quote_items"
    ADD CONSTRAINT "product_quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_notifications"
    ADD CONSTRAINT "production_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_model_code_key" UNIQUE ("model_code");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_reference_number_key" UNIQUE ("reference_number");



ALTER TABLE ONLY "public"."remedial_actions"
    ADD CONSTRAINT "remedial_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."remedial_items"
    ADD CONSTRAINT "remedial_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_appliances"
    ADD CONSTRAINT "room_appliances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."salespeople"
    ADD CONSTRAINT "salespeople_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_invitation_token_key" UNIQUE ("invitation_token");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."versioned_snapshots"
    ADD CONSTRAINT "versioned_snapshots_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_jobs_work_stage" ON "public"."jobs" USING "btree" ("work_stage");



CREATE INDEX "idx_material_change_logs_created_at" ON "public"."material_change_logs" USING "btree" ("created_at");



CREATE INDEX "idx_material_change_logs_material_order" ON "public"."material_change_logs" USING "btree" ("material_order_id");



CREATE INDEX "idx_material_orders_customer" ON "public"."material_orders" USING "btree" ("customer_id");



CREATE INDEX "idx_material_orders_delivery_date" ON "public"."material_orders" USING "btree" ("expected_delivery_date");



CREATE INDEX "idx_material_orders_order_date" ON "public"."material_orders" USING "btree" ("order_date");



CREATE INDEX "idx_material_orders_status" ON "public"."material_orders" USING "btree" ("status");



CREATE INDEX "idx_production_notifications_dismissed" ON "public"."production_notifications" USING "btree" ("dismissed");



CREATE INDEX "idx_production_notifications_read" ON "public"."production_notifications" USING "btree" ("read");



CREATE INDEX "idx_production_notifications_user_id" ON "public"."production_notifications" USING "btree" ("user_id");



CREATE INDEX "idx_users_invitation_token" ON "public"."users" USING "btree" ("invitation_token");



CREATE INDEX "ix_login_attempts_email" ON "public"."login_attempts" USING "btree" ("email");



CREATE UNIQUE INDEX "ix_users_email" ON "public"."users" USING "btree" ("email");



CREATE OR REPLACE TRIGGER "material_orders_updated_at" BEFORE UPDATE ON "public"."material_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_material_orders_updated_at"();



ALTER TABLE ONLY "public"."action_items"
    ADD CONSTRAINT "action_items_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."approval_notifications"
    ADD CONSTRAINT "approval_notifications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."customer_form_data"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_notifications"
    ADD CONSTRAINT "approval_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."checklist_items"
    ADD CONSTRAINT "checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "public"."job_checklists"("id");



ALTER TABLE ONLY "public"."counting_items"
    ADD CONSTRAINT "counting_items_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "public"."counting_sheets"("id");



ALTER TABLE ONLY "public"."counting_sheets"
    ADD CONSTRAINT "counting_sheets_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."counting_sheets"
    ADD CONSTRAINT "counting_sheets_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id");



ALTER TABLE ONLY "public"."customer_form_data"
    ADD CONSTRAINT "customer_form_data_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."customer_form_data"
    ADD CONSTRAINT "customer_form_data_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."customer_form_data"
    ADD CONSTRAINT "customer_form_data_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."customer_form_data"
    ADD CONSTRAINT "customer_form_data_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."drawing_documents"
    ADD CONSTRAINT "drawing_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drawing_documents"
    ADD CONSTRAINT "drawing_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fitters"
    ADD CONSTRAINT "fitters_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."production_notifications"
    ADD CONSTRAINT "fk_production_notifications_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_documents"
    ADD CONSTRAINT "form_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."job_checklists"
    ADD CONSTRAINT "job_checklists_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."job_form_links"
    ADD CONSTRAINT "job_form_links_form_submission_id_fkey" FOREIGN KEY ("form_submission_id") REFERENCES "public"."form_submissions"("id");



ALTER TABLE ONLY "public"."job_form_links"
    ADD CONSTRAINT "job_form_links_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."job_notes"
    ADD CONSTRAINT "job_notes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_primary_fitter_id_fkey" FOREIGN KEY ("primary_fitter_id") REFERENCES "public"."fitters"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotations"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "public"."salespeople"("id");



ALTER TABLE ONLY "public"."material_change_logs"
    ADD CONSTRAINT "material_change_logs_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."material_change_logs"
    ADD CONSTRAINT "material_change_logs_material_order_id_fkey" FOREIGN KEY ("material_order_id") REFERENCES "public"."material_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."material_orders"
    ADD CONSTRAINT "material_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."material_orders"
    ADD CONSTRAINT "material_orders_ordered_by_user_id_fkey" FOREIGN KEY ("ordered_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."product_quote_items"
    ADD CONSTRAINT "product_quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."product_quote_items"
    ADD CONSTRAINT "product_quote_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id");



ALTER TABLE ONLY "public"."production_notifications"
    ADD CONSTRAINT "production_notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."production_notifications"
    ADD CONSTRAINT "production_notifications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."appliance_categories"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."remedial_actions"
    ADD CONSTRAINT "remedial_actions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."remedial_items"
    ADD CONSTRAINT "remedial_items_remedial_id_fkey" FOREIGN KEY ("remedial_id") REFERENCES "public"."remedial_actions"("id");



ALTER TABLE ONLY "public"."room_appliances"
    ADD CONSTRAINT "room_appliances_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_assigned_fitter_id_fkey" FOREIGN KEY ("assigned_fitter_id") REFERENCES "public"."fitters"("id");



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."schedule_items"
    ADD CONSTRAINT "schedule_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "All company users can access customers" ON "public"."customers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."customers" USING (true);



CREATE POLICY "Users can insert their own login attempts" ON "public"."login_attempts" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'email'::"text") = ("email")::"text"));



CREATE POLICY "Users can view their own login attempts" ON "public"."login_attempts" FOR SELECT TO "authenticated" USING ((("auth"."jwt"() ->> 'email'::"text") = ("email")::"text"));



ALTER TABLE "public"."appliance_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklist_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."counting_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."counting_sheets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_form_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drawing_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fitters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_line_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_checklists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_form_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."login_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."material_change_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."material_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_quote_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."production_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."remedial_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."remedial_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_appliances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."salespeople" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedule_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."versioned_snapshots" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_material_orders_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_material_orders_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_material_orders_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."action_items" TO "anon";
GRANT ALL ON TABLE "public"."action_items" TO "authenticated";
GRANT ALL ON TABLE "public"."action_items" TO "service_role";



GRANT ALL ON TABLE "public"."appliance_categories" TO "anon";
GRANT ALL ON TABLE "public"."appliance_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."appliance_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."appliance_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."appliance_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."appliance_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."approval_notifications" TO "anon";
GRANT ALL ON TABLE "public"."approval_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."approval_notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."approval_notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."approval_notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";



GRANT ALL ON SEQUENCE "public"."brands_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."brands_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."brands_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_items" TO "anon";
GRANT ALL ON TABLE "public"."checklist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."checklist_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."checklist_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."checklist_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."counting_items" TO "anon";
GRANT ALL ON TABLE "public"."counting_items" TO "authenticated";
GRANT ALL ON TABLE "public"."counting_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."counting_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."counting_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."counting_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."counting_sheets" TO "anon";
GRANT ALL ON TABLE "public"."counting_sheets" TO "authenticated";
GRANT ALL ON TABLE "public"."counting_sheets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."counting_sheets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."counting_sheets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."counting_sheets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."customer_form_data" TO "anon";
GRANT ALL ON TABLE "public"."customer_form_data" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_form_data" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customer_form_data_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customer_form_data_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customer_form_data_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."data_imports" TO "anon";
GRANT ALL ON TABLE "public"."data_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."data_imports" TO "service_role";



GRANT ALL ON SEQUENCE "public"."data_imports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."data_imports_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."data_imports_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."document_templates" TO "anon";
GRANT ALL ON TABLE "public"."document_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."document_templates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."document_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."document_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."document_templates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."drawing_documents" TO "anon";
GRANT ALL ON TABLE "public"."drawing_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."drawing_documents" TO "service_role";



GRANT ALL ON TABLE "public"."fitters" TO "anon";
GRANT ALL ON TABLE "public"."fitters" TO "authenticated";
GRANT ALL ON TABLE "public"."fitters" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fitters_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fitters_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fitters_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."form_documents" TO "anon";
GRANT ALL ON TABLE "public"."form_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."form_documents" TO "service_role";



GRANT ALL ON TABLE "public"."form_submissions" TO "anon";
GRANT ALL ON TABLE "public"."form_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."form_submissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."form_submissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."form_submissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."form_submissions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_line_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_line_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_line_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoice_line_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoice_line_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoice_line_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."job_checklists" TO "anon";
GRANT ALL ON TABLE "public"."job_checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."job_checklists" TO "service_role";



GRANT ALL ON SEQUENCE "public"."job_checklists_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."job_checklists_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."job_checklists_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."job_documents" TO "anon";
GRANT ALL ON TABLE "public"."job_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."job_documents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."job_documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."job_documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."job_documents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."job_form_links" TO "anon";
GRANT ALL ON TABLE "public"."job_form_links" TO "authenticated";
GRANT ALL ON TABLE "public"."job_form_links" TO "service_role";



GRANT ALL ON SEQUENCE "public"."job_form_links_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."job_form_links_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."job_form_links_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."job_notes" TO "anon";
GRANT ALL ON TABLE "public"."job_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."job_notes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."job_notes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."job_notes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."job_notes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."login_attempts" TO "anon";
GRANT ALL ON TABLE "public"."login_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."login_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."login_attempts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."login_attempts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."login_attempts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."material_change_logs" TO "anon";
GRANT ALL ON TABLE "public"."material_change_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."material_change_logs" TO "service_role";



GRANT ALL ON TABLE "public"."material_orders" TO "anon";
GRANT ALL ON TABLE "public"."material_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."material_orders" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_quote_items" TO "anon";
GRANT ALL ON TABLE "public"."product_quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."product_quote_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_quote_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_quote_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_quote_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."production_notifications" TO "anon";
GRANT ALL ON TABLE "public"."production_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."production_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."quotation_items" TO "anon";
GRANT ALL ON TABLE "public"."quotation_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quotation_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quotation_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quotation_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quotation_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quotations" TO "anon";
GRANT ALL ON TABLE "public"."quotations" TO "authenticated";
GRANT ALL ON TABLE "public"."quotations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quotations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quotations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quotations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."remedial_actions" TO "anon";
GRANT ALL ON TABLE "public"."remedial_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."remedial_actions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."remedial_actions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."remedial_actions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."remedial_actions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."remedial_items" TO "anon";
GRANT ALL ON TABLE "public"."remedial_items" TO "authenticated";
GRANT ALL ON TABLE "public"."remedial_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."remedial_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."remedial_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."remedial_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."room_appliances" TO "anon";
GRANT ALL ON TABLE "public"."room_appliances" TO "authenticated";
GRANT ALL ON TABLE "public"."room_appliances" TO "service_role";



GRANT ALL ON SEQUENCE "public"."room_appliances_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."room_appliances_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."room_appliances_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rooms_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rooms_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rooms_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."salespeople" TO "anon";
GRANT ALL ON TABLE "public"."salespeople" TO "authenticated";
GRANT ALL ON TABLE "public"."salespeople" TO "service_role";



GRANT ALL ON SEQUENCE "public"."salespeople_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."salespeople_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."salespeople_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_items" TO "anon";
GRANT ALL ON TABLE "public"."schedule_items" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."schedule_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."schedule_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."schedule_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_sessions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_sessions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_sessions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."v_materials_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."v_materials_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."v_materials_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."versioned_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."versioned_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."versioned_snapshots" TO "service_role";



GRANT ALL ON SEQUENCE "public"."versioned_snapshots_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."versioned_snapshots_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."versioned_snapshots_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







