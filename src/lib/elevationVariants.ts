import { supabase } from '@/integrations/supabase/client';
import type { AddOn, ConfigState, HomeType, KitchenType, Material, RoofType } from '@/store/configurator';
import { getElevationLookupKeys, getElevationVariantSignature, getElevationVisualAddons } from '@/store/configurator';

export type ElevationVariantState = Pick<ConfigState, 'homeType' | 'bedrooms' | 'bathrooms' | 'kitchen' | 'isDoubleStorey' | 'addons' | 'roof' | 'material'>;

export interface ElevationVariantRecord {
  id: string;
  variant_signature: string;
  legacy_preset_key: string | null;
  home_type: HomeType | null;
  bedrooms: number | null;
  bathrooms: number | null;
  kitchen: KitchenType | null;
  is_double_storey: boolean | null;
  roof: RoofType | null;
  material: Material | null;
  visual_addons: string[];
  preset_id: number | null;
}

export interface ElevationImageRecord {
  id: string;
  image_url: string;
  image_path: string;
  variant_id?: string | null;
  preset_key?: string;
}

const buildVariantInsert = (state: ElevationVariantState, presetId: number, legacyPresetKey: string) => ({
  variant_signature: getElevationVariantSignature(state, presetId),
  legacy_preset_key: legacyPresetKey,
  home_type: state.homeType,
  bedrooms: state.bedrooms,
  bathrooms: state.bathrooms,
  kitchen: state.kitchen,
  is_double_storey: state.isDoubleStorey,
  roof: state.roof,
  material: state.material,
  visual_addons: getElevationVisualAddons(state.addons || []),
  preset_id: presetId,
});

export const resolveElevationVariant = async (state: ElevationVariantState, presetId: number): Promise<ElevationVariantRecord> => {
  const lookupKeys = getElevationLookupKeys(state, presetId);
  const legacyPresetKey = lookupKeys[0];
  const variantSignature = getElevationVariantSignature(state, presetId);

  const { data: existingBySignature, error: signatureError } = await supabase
    .from('elevation_variants')
    .select('*')
    .eq('variant_signature', variantSignature)
    .maybeSingle();

  if (signatureError) throw signatureError;

  if (existingBySignature?.id) {
    if (!existingBySignature.legacy_preset_key || existingBySignature.legacy_preset_key !== legacyPresetKey) {
      const { data: updatedVariant, error: updateError } = await supabase
        .from('elevation_variants')
        .update({ legacy_preset_key: legacyPresetKey, updated_at: new Date().toISOString() })
        .eq('id', existingBySignature.id)
        .select('*')
        .single();
      if (updateError) throw updateError;
      return updatedVariant as ElevationVariantRecord;
    }
    return existingBySignature as ElevationVariantRecord;
  }

  for (const key of lookupKeys) {
    const { data: legacyVariant, error: legacyError } = await supabase
      .from('elevation_variants')
      .select('*')
      .eq('legacy_preset_key', key)
      .maybeSingle();

    if (legacyError) throw legacyError;

    if (legacyVariant?.id) {
      if (legacyVariant.variant_signature !== variantSignature) {
        const { data: updatedVariant, error: updateError } = await supabase
          .from('elevation_variants')
          .update({
            ...buildVariantInsert(state, presetId, key),
            updated_at: new Date().toISOString(),
          })
          .eq('id', legacyVariant.id)
          .select('*')
          .single();
        if (updateError) throw updateError;
        return updatedVariant as ElevationVariantRecord;
      }
      return legacyVariant as ElevationVariantRecord;
    }
  }

  const { data: insertedVariant, error: insertError } = await supabase
    .from('elevation_variants')
    .insert(buildVariantInsert(state, presetId, legacyPresetKey))
    .select('*')
    .single();

  if (insertError) throw insertError;
  return insertedVariant as ElevationVariantRecord;
};

export const fetchElevationImagesByVariant = async (
  variantId: string,
  lookupKeys: string[] = []
): Promise<ElevationImageRecord[]> => {
  const seen = new Set<string>();
  const collected: ElevationImageRecord[] = [];

  const { data: byVariant, error: variantError } = await supabase
    .from('elevation_images')
    .select('id, image_url, image_path, variant_id, preset_key')
    .eq('variant_id', variantId)
    .order('created_at', { ascending: true });

  if (variantError) throw variantError;

  (byVariant || []).forEach((row) => {
    const dedupeKey = row.id || row.image_url;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    collected.push(row as ElevationImageRecord);
  });

  if (collected.length > 0) {
    return collected;
  }

  for (const key of lookupKeys) {
    const { data, error } = await supabase
      .from('elevation_images')
      .select('id, image_url, image_path, variant_id, preset_key')
      .eq('preset_key', key)
      .order('created_at', { ascending: true });

    if (error) throw error;

    (data || []).forEach((row) => {
      const dedupeKey = row.id || row.image_url;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      collected.push(row as ElevationImageRecord);
    });

    if (collected.length > 0) {
      return collected;
    }
  }

  return collected;
};

export const fetchElevationVariantFamily = async (state: Pick<ElevationVariantState, 'homeType' | 'bedrooms' | 'bathrooms' | 'kitchen' | 'isDoubleStorey'>, presetId: number) => {
  const { data, error } = await supabase
    .from('elevation_variants')
    .select('id, variant_signature, legacy_preset_key, home_type, bedrooms, bathrooms, kitchen, is_double_storey, roof, material, visual_addons, preset_id, elevation_images(id, image_url)')
    .eq('home_type', state.homeType)
    .eq('bedrooms', state.bedrooms)
    .eq('bathrooms', state.bathrooms)
    .eq('kitchen', state.kitchen)
    .eq('is_double_storey', state.isDoubleStorey)
    .eq('preset_id', presetId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    image_count: row.elevation_images?.length || 0,
    sample_url: row.elevation_images?.[0]?.image_url || '',
  }));
};

export const normalizeParsedVariantAddons = (addons: string[]) => addons.filter((addon): addon is AddOn => (
  ['carport', 'landscaping', 'fence', 'solar', 'water_tank'].includes(addon)
));
