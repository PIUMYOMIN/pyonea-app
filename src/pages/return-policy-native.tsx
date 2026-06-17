import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";

import { AppLayout } from "@/components/layout/app-layout";
import { useAppTranslation } from "@/i18n";

function PolicyCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-lg bg-white p-6 shadow-md shadow-gray-200/70 dark:bg-slate-800 dark:shadow-slate-950/40">
      {children}
    </View>
  );
}

function PolicySection({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <Feather name={icon} color="#15803d" size={18} />
        </View>
        <Text className="min-w-0 flex-1 font-sans text-xl font-medium text-gray-900 dark:text-slate-200">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function BulletList({
  items,
  tone = "green",
}: {
  items: string[];
  tone?: "green" | "blue";
}) {
  const color = tone === "blue" ? "#2563eb" : "#16a34a";

  return (
    <View className="gap-2">
      {items.map((item) => (
        <View key={item} className="flex-row items-start gap-3">
          <Feather
            name="check-circle"
            color={color}
            size={17}
            style={{ marginTop: 2 }}
          />
          <Text className="min-w-0 flex-1 font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ReturnPolicyNative() {
  const { t } = useAppTranslation();
  const lastUpdated = new Date().toLocaleDateString("en-GB");
  const minimumRequirements = t(
    "returnPolicy.platformPolicy.minimumRequirements.items",
    {
      returnObjects: true,
    },
  ) as unknown as string[];
  const consumerRights = t("returnPolicy.platformPolicy.consumerRights.items", {
    returnObjects: true,
  }) as unknown as string[];

  return (
    <AppLayout>
      <View className="bg-gray-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
        <View className="mx-auto w-full max-w-4xl">
          <Text className="mb-2 text-center font-sans text-2xl font-bold text-gray-950 dark:text-slate-100 sm:text-3xl">
            {t("returnPolicy.title")}
          </Text>
          <Text className="mb-8 text-center font-sans text-base leading-6 text-gray-600 dark:text-slate-400">
            {t("returnPolicy.subtitle")}
          </Text>

          <View className="gap-8">
            <PolicyCard>
              <View className="mb-6 flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                  <Feather name="refresh-cw" color="#15803d" size={21} />
                </View>
                <Text className="min-w-0 flex-1 font-sans text-2xl font-semibold text-gray-950 dark:text-slate-100">
                  {t("returnPolicy.platformPolicy.title")}
                </Text>
              </View>

              <Text className="mb-6 font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
                {t("returnPolicy.platformPolicy.description")}
              </Text>

              <View className="gap-6">
                <PolicySection
                  icon="user-check"
                  title={t(
                    "returnPolicy.platformPolicy.buyerResponsibility.title",
                  )}
                >
                  <Text className="font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
                    {t("returnPolicy.platformPolicy.buyerResponsibility.text")}
                  </Text>
                </PolicySection>

                <PolicySection
                  icon="shield"
                  title={t("returnPolicy.platformPolicy.platformRole.title")}
                >
                  <Text className="font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
                    {t("returnPolicy.platformPolicy.platformRole.text")}
                  </Text>
                </PolicySection>

                <PolicySection
                  icon="check-square"
                  title={t(
                    "returnPolicy.platformPolicy.minimumRequirements.title",
                  )}
                >
                  <BulletList items={minimumRequirements} />
                </PolicySection>

                <PolicySection
                  icon="file-text"
                  title={t("returnPolicy.platformPolicy.consumerRights.title")}
                >
                  <BulletList items={consumerRights} tone="blue" />
                </PolicySection>

                <PolicySection
                  icon="message-circle"
                  title={t(
                    "returnPolicy.platformPolicy.disputeResolution.title",
                  )}
                >
                  <Text className="font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
                    {t("returnPolicy.platformPolicy.disputeResolution.text")}
                  </Text>
                </PolicySection>
              </View>
            </PolicyCard>

            <PolicyCard>
              <View className="mb-4 flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Feather name="shopping-bag" color="#2563eb" size={21} />
                </View>
                <Text className="min-w-0 flex-1 font-sans text-2xl font-semibold text-gray-950 dark:text-slate-100">
                  {t("returnPolicy.sellerPolicy.title")}
                </Text>
              </View>
              <Text className="font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
                {t("returnPolicy.sellerPolicy.description")}
              </Text>
            </PolicyCard>

            <View className="border-t border-gray-200 pt-6 dark:border-slate-700">
              <Text className="text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                {t("returnPolicy.lastUpdated", { date: lastUpdated })}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}
