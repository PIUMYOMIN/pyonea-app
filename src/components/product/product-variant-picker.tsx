import { OptimizedImage as Image } from "@/components/ui/optimized-image";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useAppTranslation } from "@/i18n";
import type { ProductOption, ProductVariant } from "@/utils/native-api";

type SelectedChoiceMap = Record<string, string | null>;
type SelectedTextMap = Record<string, string>;

const hasRealVariantCombinations = (variants: ProductVariant[]) =>
  variants.some((variant) => variant.optionValueIds.length > 0);

const findMatchingVariant = (
  variants: ProductVariant[],
  selected: SelectedChoiceMap,
  textInputs: SelectedTextMap,
) => {
  const selectedIds = Object.values(selected).filter(Boolean).map(String);
  const hasTextInput = Object.values(textInputs).some((value) => value.trim());
  if (selectedIds.length === 0 && !hasTextInput) return null;

  if (!hasRealVariantCombinations(variants)) return variants[0] ?? null;

  return (
    variants.find((variant) => {
      const variantValueIds = variant.optionValueIds.map(String);
      return (
        selectedIds.length === variantValueIds.length &&
        selectedIds.every((id) => variantValueIds.includes(id))
      );
    }) ?? null
  );
};

const wouldHaveMatch = (
  variants: ProductVariant[],
  currentSelected: SelectedChoiceMap,
  optionId: string | number,
  valueId: string | number,
) => {
  if (!hasRealVariantCombinations(variants)) return true;

  const hypothetical = {
    ...currentSelected,
    [String(optionId)]: String(valueId),
  };
  const selectedIds = Object.values(hypothetical).filter(Boolean).map(String);

  return variants.some((variant) => {
    const variantValueIds = variant.optionValueIds.map(String);
    return selectedIds.every((id) => variantValueIds.includes(id));
  });
};

const buildSelectedOptions = (
  options: ProductOption[],
  selected: SelectedChoiceMap,
  textInputs: SelectedTextMap,
) => {
  const snapshot: Record<string, string> = {};

  options.forEach((option) => {
    const optionId = String(option.id);
    if (option.type === "input") {
      const value = textInputs[optionId]?.trim();
      if (value) snapshot[option.name] = value;
      return;
    }

    const chosenId = selected[optionId];
    const chosenValue = option.values.find(
      (value) => String(value.id) === String(chosenId),
    );
    if (chosenValue) snapshot[option.name] = chosenValue.label;
  });

  return snapshot;
};

export function ProductVariantPicker({
  options,
  variants,
  onVariantChange,
}: {
  options: ProductOption[];
  variants: ProductVariant[];
  onVariantChange: (
    variant: ProductVariant | null,
    selectedOptions: Record<string, string>,
  ) => void;
}) {
  const { t } = useAppTranslation();
  const [selected, setSelected] = useState<SelectedChoiceMap>({});
  const [textInputs, setTextInputs] = useState<SelectedTextMap>({});

  const notify = (
    nextSelected: SelectedChoiceMap,
    nextTextInputs: SelectedTextMap,
  ) => {
    onVariantChange(
      findMatchingVariant(variants, nextSelected, nextTextInputs),
      buildSelectedOptions(options, nextSelected, nextTextInputs),
    );
  };

  const handleSelect = (
    optionId: string | number,
    valueId: string | number,
  ) => {
    const optionKey = String(optionId);
    const valueKey = String(valueId);
    const nextSelected = {
      ...selected,
      [optionKey]: selected[optionKey] === valueKey ? null : valueKey,
    };
    setSelected(nextSelected);
    notify(nextSelected, textInputs);
  };

  const handleTextInput = (optionId: string | number, value: string) => {
    const nextTextInputs = { ...textInputs, [String(optionId)]: value };
    setTextInputs(nextTextInputs);
    notify(selected, nextTextInputs);
  };

  if (!options.length) return null;

  const nonInputOptions = options.filter((option) => option.type !== "input");
  const allSelected = nonInputOptions.every(
    (option) => selected[String(option.id)],
  );
  const matched = findMatchingVariant(variants, selected, textInputs);
  const showUnavailable =
    hasRealVariantCombinations(variants) &&
    nonInputOptions.length > 0 &&
    allSelected &&
    !matched;

  return (
    <View className="gap-5">
      {options.map((option) => {
        const optionKey = String(option.id);
        const selectedValue = option.values.find(
          (value) => String(value.id) === String(selected[optionKey]),
        );

        return (
          <View key={optionKey} className="min-w-0">
            <View className="mb-2.5 gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="font-sans text-sm font-semibold text-gray-800 dark:text-slate-200">
                  {option.name}
                </Text>
                {option.isRequired ? (
                  <View className="rounded-full bg-red-50 px-2 py-0.5 dark:bg-red-900/20">
                    <Text className="font-sans text-xs font-medium text-red-600 dark:text-red-300">
                      {t("product_form.options.required", {
                        defaultValue: "Required",
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>
              {selectedValue ? (
                <Text className="font-sans text-sm text-gray-500 dark:text-slate-400 sm:min-w-0">
                  :{" "}
                  <Text className="font-sans font-medium text-gray-700 dark:text-slate-300">
                    {selectedValue.label}
                  </Text>
                </Text>
              ) : null}
            </View>

            {option.type === "input" ? (
              <TextInput
                value={textInputs[optionKey] ?? ""}
                onChangeText={(value) => handleTextInput(option.id, value)}
                placeholder={`Enter ${option.name.toLowerCase()}...`}
                placeholderTextColor="#94a3b8"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:max-w-xl"
              />
            ) : (
              <View className="-mx-0.5 flex-row flex-nowrap gap-2 overflow-x-auto pb-1 sm:-mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0 sm:gap-3">
                {option.values.map((value) => {
                  const selectedItem =
                    String(selected[optionKey]) === String(value.id);
                  const disabled =
                    !selectedItem &&
                    !wouldHaveMatch(variants, selected, option.id, value.id);
                  const isColor = option.type === "color";
                  const isImage = option.type === "image";

                  return (
                    <Pressable
                      key={String(value.id)}
                      onPress={() => {
                        if (!disabled) handleSelect(option.id, value.id);
                      }}
                      disabled={disabled}
                      className={`min-h-10 min-w-0 shrink-0 items-center justify-center rounded-lg border ${
                        isColor
                          ? "h-11 w-11 rounded-full p-1 sm:h-12 sm:w-12"
                          : isImage
                            ? "w-20 p-1 sm:w-24"
                            : "max-w-full px-3 py-2 sm:px-4"
                      } ${
                        selectedItem
                          ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                          : "border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                      } ${disabled ? "opacity-30" : ""}`}
                    >
                      {isColor ? (
                        <View
                          className="h-full w-full items-center justify-center rounded-full border border-gray-300 dark:border-slate-500"
                          style={{
                            backgroundColor: value.meta.hex || "#cccccc",
                          }}
                        >
                          {selectedItem ? (
                            <View className="h-3 w-3 rounded-full bg-white shadow" />
                          ) : null}
                        </View>
                      ) : isImage ? (
                        <View className="items-center gap-1">
                          <View className="h-12 w-12 overflow-hidden rounded-md bg-gray-100 dark:bg-slate-700 sm:h-14 sm:w-14">
                            {value.meta.imageUrl ? (
                              <Image
                                source={{ uri: value.meta.imageUrl }}
                                style={{ width: "100%", height: "100%" }}
                                contentFit="cover"
                              />
                            ) : (
                              <View className="h-full w-full items-center justify-center">
                                <Feather
                                  name="image"
                                  color="#94a3b8"
                                  size={16}
                                />
                              </View>
                            )}
                          </View>
                          <Text
                            className={`font-sans text-[10px] ${
                              selectedItem
                                ? "text-green-700 dark:text-green-300"
                                : "text-gray-500 dark:text-slate-400"
                            }`}
                            numberOfLines={1}
                          >
                            {value.label}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          className={`font-sans text-sm font-medium ${
                            selectedItem
                              ? "text-green-700 dark:text-green-300"
                              : "text-gray-700 dark:text-slate-300"
                          }`}
                          numberOfLines={1}
                        >
                          {value.label}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      {showUnavailable ? (
        <View className="flex-row items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-900/20">
          <Feather name="alert-circle" color="#d97706" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-amber-700 dark:text-amber-400">
            {t("product_form.variants.unavailable_combination", {
              defaultValue: "This combination is currently unavailable.",
            })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
