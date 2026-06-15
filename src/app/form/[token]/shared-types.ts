// src/app/form/[token]/shared-types.ts
// ✅ UPDATED VERSION - Added door_type field

export interface Appliance {
  make: string;
  model: string;
  order_date: string;
}

export interface AdditionalDoor {
  door_style: string;
  door_color: string;
  door_type?: string;  
  door_manufacturer?: string;
  door_name?: string;
  glazing_material?: string;
  panel_color?: string;
  plinth_color?: string;
  cabinet_color?: string;
  worktop_color?: string;
  quantity: string;
}

export interface AdditionalHandle {
  handles_code: string;
  handles_quantity: string;
  handles_size: string;
}

export interface BaseFormData {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_postcode: string;
  postcode: string;
  door_style: string;
  door_color: string;
  door_type: string;  
  door_manufacturer: string;
  door_name: string;
  glazing_material: string;
  plinth_filler_color: string;
  end_panel_color: string;
  cabinet_color: string;
  additional_doors: AdditionalDoor[];
  additional_handles: AdditionalHandle[];
  handles_code: string;
  handles_quantity: string;
  handles_size: string;
  terms_date: string;
  gas_electric_info: string;
  signature_name: string;
  signature_date: string;
}

export interface AdditionalWorktop {
  worktop_material_type: string;
  worktop_material_color: string;
  worktop_code: string;
  worktop_size: string;
  worktop_features: string[];
  worktop_other_details: string;
}

export interface KitchenFormData extends BaseFormData {
  accessories: string;
  lighting_spec: string;
  worktop_material_type: string;
  worktop_material_color: string;
  worktop_code: string;
  additional_worktops: AdditionalWorktop[];
  worktop_features: string[];
  worktop_other_details: string;
  worktop_size: string;
  under_wall_unit_lights_color: string;
  under_wall_unit_lights_profile: string;
  under_worktop_lights_color: string;
  kitchen_accessories: string;
  appliances_customer_owned: string;
  sink_tap_customer_owned: string;
  sink_details: string;
  sink_model: string;
  tap_details: string;
  tap_model: string;
  other_appliances: string;
  appliances: Appliance[];
  appliance_promotion_info: string;
  integ_fridge_qty: string;
  integ_fridge_make: string;
  integ_fridge_model: string;
  integ_fridge_order_date: string;
  integ_freezer_qty: string;
  integ_freezer_make: string;
  integ_freezer_model: string;
  integ_freezer_order_date: string;
  survey_date: string;
  appointment_date: string;
  installation_date: string;
  completion_date: string;
  deposit_date: string;
}

export interface BedroomFormData extends BaseFormData {
  room: string;
  bedside_cabinets_type: string;
  bedside_cabinets_qty: string;
  dresser_desk: string;
  worktop_code: string;
  additional_worktops: AdditionalWorktop[];
  dresser_desk_details: string;
  internal_mirror: string;
  internal_mirror_details: string;
  mirror_type: string;
  mirror_qty: string;
  soffit_lights_type: string;
  soffit_lights_color: string;
  gable_lights_type: string;
  gable_lights_main_color: string;
  gable_lights_profile_color: string;
  other_accessories: string;
  floor_protection: string[];
  worktop_material_color: string;
}

export interface OrderMaterialsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sectionTitle: string;
  sectionData: Record<string, any>;
  customerInfo: {
    id: string;
    name: string;
    phone: string;
    address: string;
  };
}