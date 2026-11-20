import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { getProfileData } from "@/actions/profile";
import { AthleteOnboardingWizard } from "@/components/onboarding/athlete-onboarding-wizard";
import {
  resolveCoreModalityCode,
  type CoreModalityCode,
  type ExperienceLevel,
} from "@/core/modalities";

export const instant = false;

async function OnboardingLoader() {
  const data = await getProfileData();

  const primarySportRow =
    data.userSportsList.find((s) => s.role === "primary") ||
    data.userSportsList[0];

  const initialPrimary: CoreModalityCode =
    resolveCoreModalityCode(primarySportRow?.code) || "strength";

  const initialComplementary: CoreModalityCode[] = data.userSportsList
    .filter((s) => s.role === "complementary" || s.id !== primarySportRow?.id)
    .map((s) => resolveCoreModalityCode(s.code))
    .filter(
      (c): c is CoreModalityCode => c !== null && c !== initialPrimary
    );

  const latestWeight = data.metrics.find((m) => m.metricType === "weight");
  const latestRhr = data.metrics.find((m) => m.metricType === "resting_hr");

  const validLevels: ExperienceLevel[] = [
    "beginner",
    "intermediate",
    "advanced",
    "competitive",
  ];
  const rawLevel = data.profile?.experienceLevel as ExperienceLevel | undefined;
  const initialExperienceLevel: ExperienceLevel =
    rawLevel && validLevels.includes(rawLevel) ? rawLevel : "intermediate";

  return (
    <AthleteOnboardingWizard
      initialCalibration={data.profile?.eaCalibration ?? null}
      initialPrimaryModality={initialPrimary}
      initialComplementary={initialComplementary}
      initialExperienceLevel={initialExperienceLevel}
      initialWeightKg={latestWeight?.valueNumeric ?? null}
      initialRestingHrBpm={latestRhr?.valueNumeric ?? null}
      initialTargetKpiKey={primarySportRow?.targetKpiKey ?? null}
      initialTargetKpiValue={primarySportRow?.targetKpiValue ?? null}
    />
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-6 flex-1">
        <Suspense
          fallback={
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              <div className="skeleton h-32 w-full" />
              <div className="skeleton h-80 w-full" />
            </div>
          }
        >
          <OnboardingLoader />
        </Suspense>
      </main>
    </div>
  );
}
