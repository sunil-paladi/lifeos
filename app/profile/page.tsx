"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/app/lib/auth-client";

type Profile = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  phoneNumber: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  fitnessGoal:
    | "LOSE_WEIGHT"
    | "BUILD_MUSCLE"
    | "MAINTAIN_WEIGHT"
    | "IMPROVE_FITNESS"
    | null;
  activityLevel:
    | "SEDENTARY"
    | "LIGHT"
    | "MODERATE"
    | "VERY_ACTIVE"
    | null;
  trainingExperience:
    | "BEGINNER"
    | "INTERMEDIATE"
    | "ADVANCED"
    | null;
  targetWeight: number | null;
  preferredTrainingDays: number | null;
};

type WeightEntry = {
  id: string;
  weight: number;
  recordedAt: string;
};

const colors = {
  page: "#f5f8fc",
  card: "#ffffff",
  navy: "#101828",
  text: "#344054",
  muted: "#667085",
  border: "#dfe5ef",
  blue: "#2563eb",
  blueLight: "#eff6ff",
  blueBorder: "#bfdbfe",
  green: "#067647",
  greenLight: "#ecfdf3",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  background: "#ffffff",
  color: colors.navy,
  fontSize: "14px",
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: colors.text,
  marginBottom: "7px",
};

const cardStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: "14px",
  padding: "26px",
  marginBottom: "20px",
  boxShadow: "0 2px 8px rgba(16, 24, 40, 0.04)",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  // ========================================
  // PROFILE STATE
  // ========================================

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");

  const [activityLevel, setActivityLevel] = useState("");
  const [trainingExperience, setTrainingExperience] =
    useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [preferredTrainingDays, setPreferredTrainingDays] =
    useState("");

  // ========================================
  // PROFILE UI STATE
  // ========================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // ========================================
  // WEIGHT STATE
  // ========================================

  const [weightHistory, setWeightHistory] = useState<
    WeightEntry[]
  >([]);

  const [newWeight, setNewWeight] = useState("");
  const [weightLoading, setWeightLoading] = useState(true);
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightMessage, setWeightMessage] = useState("");

  // ========================================
  // LOAD WEIGHT HISTORY
  // ========================================

  async function loadWeightHistory() {
    try {
      const response = await fetch("/api/weight");

      if (!response.ok) {
        setWeightMessage(
          "Unable to load weight history"
        );
        setWeightLoading(false);
        return;
      }

      const data = await response.json();

      setWeightHistory(data.weightEntries ?? []);
    } catch {
      setWeightMessage(
        "Unable to load weight history"
      );
    } finally {
      setWeightLoading(false);
    }
  }

  // ========================================
  // LOAD PROFILE
  // ========================================

  useEffect(() => {
    async function loadProfile() {
      const session = await authClient.getSession();

      if (!session.data?.user) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/profile");

      if (!response.ok) {
        setMessage("Unable to load profile");
        setLoading(false);
        return;
      }

      const data = await response.json();

      setProfile(data.user);

      setName(data.user.name ?? "");
      setPhoneNumber(data.user.phoneNumber ?? "");
      setAge(data.user.age?.toString() ?? "");
      setHeight(data.user.height?.toString() ?? "");
      setWeight(data.user.weight?.toString() ?? "");
      setFitnessGoal(data.user.fitnessGoal ?? "");

      setActivityLevel(data.user.activityLevel ?? "");
      setTrainingExperience(
        data.user.trainingExperience ?? ""
      );
      setTargetWeight(
        data.user.targetWeight?.toString() ?? ""
      );
      setPreferredTrainingDays(
        data.user.preferredTrainingDays?.toString() ?? ""
      );

      setLoading(false);

      await loadWeightHistory();
    }

    loadProfile();
  }, []);

  // ========================================
  // UPDATE PROFILE
  // ========================================

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phoneNumber: phoneNumber || null,
          age: age ? Number(age) : null,
          height: height ? Number(height) : null,
          weight: weight ? Number(weight) : null,
          fitnessGoal: fitnessGoal || null,
          activityLevel: activityLevel || null,
          trainingExperience:
            trainingExperience || null,
          targetWeight: targetWeight
            ? Number(targetWeight)
            : null,
          preferredTrainingDays:
            preferredTrainingDays
              ? Number(preferredTrainingDays)
              : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error || "Failed to update profile"
        );
        return;
      }

      setProfile(data.user);
      setWeight(data.user.weight?.toString() ?? "");

      setMessage("Profile updated successfully!");
    } catch {
      setMessage("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // ADD WEIGHT
  // ========================================

  async function handleAddWeight(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setWeightMessage("");

    const numericWeight = Number(newWeight);

    if (
      !Number.isFinite(numericWeight) ||
      numericWeight <= 0
    ) {
      setWeightMessage("Please enter a valid weight.");
      return;
    }

    setWeightSaving(true);

    try {
      const response = await fetch("/api/weight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weight: numericWeight,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setWeightMessage(
          data.error || "Failed to add weight"
        );
        return;
      }

      // Update profile's current weight
      setProfile(data.user);
      setWeight(numericWeight.toString());

      // Add newest entry to the beginning
      setWeightHistory((current) => [
        data.weightEntry,
        ...current,
      ]);

      setNewWeight("");

      setWeightMessage(
        "Weight added successfully!"
      );
    } catch {
      setWeightMessage(
        "Failed to add weight. Please try again."
      );
    } finally {
      setWeightSaving(false);
    }
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <main style={{ padding: "40px" }}>
        <p style={{ color: colors.muted }}>
          Loading profile...
        </p>
      </main>
    );
  }

  // ========================================
  // PROFILE NOT FOUND
  // ========================================

  if (!profile) {
    return (
      <main style={{ padding: "40px" }}>
        <p style={{ color: colors.muted }}>
          Profile could not be loaded.
        </p>
      </main>
    );
  }

  // ========================================
  // PAGE
  // ========================================

  return (
    <main
      style={{
        minHeight: "100vh",
        background: colors.page,
        padding: "40px 28px 60px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {/* ========================================
            PAGE HEADER
        ======================================== */}

        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-block",
              padding: "5px 10px",
              borderRadius: "20px",
              background: colors.blueLight,
              color: colors.blue,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Account
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              lineHeight: 1.2,
              fontWeight: 700,
              color: colors.navy,
            }}
          >
            LifeOS Profile
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: colors.muted,
              fontSize: "14px",
            }}
          >
            Manage your personal and fitness information.
          </p>
        </div>

        {/* ========================================
            PROFILE FORM
        ======================================== */}

        <form onSubmit={handleSave}>

          {/* ========================================
              BASIC INFORMATION
          ======================================== */}

          <section style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  width: "4px",
                  minHeight: "42px",
                  borderRadius: "4px",
                  background: colors.blue,
                }}
              />

              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    color: colors.navy,
                  }}
                >
                  Basic Information
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: colors.muted,
                    fontSize: "13px",
                  }}
                >
                  Your basic LifeOS account information.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "20px",
              }}
            >
              {/* Name */}

              <div>
                <label style={labelStyle}>
                  Name
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                  style={inputStyle}
                />
              </div>

              {/* Username */}

              <div>
                <label style={labelStyle}>
                  Username
                </label>

                <input
                  value={profile.username ?? ""}
                  disabled
                  style={{
                    ...inputStyle,
                    background: "#f8fafc",
                    color: colors.muted,
                  }}
                />

                <small
                  style={{
                    display: "block",
                    marginTop: "5px",
                    color: "#98a2b3",
                  }}
                >
                  Username cannot be changed.
                </small>
              </div>

              {/* Email */}

              <div>
                <label style={labelStyle}>
                  Email
                </label>

                <input
                  value={profile.email ?? ""}
                  disabled
                  style={{
                    ...inputStyle,
                    background: "#f8fafc",
                    color: colors.muted,
                  }}
                />
              </div>

              {/* Mobile */}

              <div>
                <label style={labelStyle}>
                  Mobile Number
                </label>

                <input
                  value={phoneNumber}
                  onChange={(e) =>
                    setPhoneNumber(e.target.value)
                  }
                  placeholder="Optional"
                  style={inputStyle}
                />
              </div>
            </div>
          </section>

          {/* ========================================
              FITNESS INFORMATION
          ======================================== */}

          <section style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  width: "4px",
                  minHeight: "42px",
                  borderRadius: "4px",
                  background: colors.blue,
                }}
              />

              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    color: colors.navy,
                  }}
                >
                  Fitness Information
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: colors.muted,
                    fontSize: "13px",
                  }}
                >
                  Help LifeOS understand your current
                  fitness profile.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "20px",
              }}
            >
              {/* Age */}

              <div>
                <label style={labelStyle}>
                  Age
                </label>

                <input
                  type="number"
                  value={age}
                  onChange={(e) =>
                    setAge(e.target.value)
                  }
                  min="1"
                  max="120"
                  placeholder="Optional"
                  style={inputStyle}
                />
              </div>

              {/* Height */}

              <div>
                <label style={labelStyle}>
                  Height (cm)
                </label>

                <input
                  type="number"
                  value={height}
                  onChange={(e) =>
                    setHeight(e.target.value)
                  }
                  min="50"
                  max="300"
                  step="0.1"
                  placeholder="Optional"
                  style={inputStyle}
                />
              </div>

              {/* Current Weight */}

              <div>
                <label style={labelStyle}>
                  Current Weight (kg)
                </label>

                <input
                  type="number"
                  value={weight}
                  onChange={(e) =>
                    setWeight(e.target.value)
                  }
                  min="10"
                  max="500"
                  step="0.1"
                  placeholder="Optional"
                  style={inputStyle}
                />
              </div>

              {/* Target Weight */}

              <div>
                <label style={labelStyle}>
                  Target Weight (kg)
                </label>

                <input
                  type="number"
                  value={targetWeight}
                  onChange={(e) =>
                    setTargetWeight(e.target.value)
                  }
                  min="10"
                  max="500"
                  step="0.1"
                  placeholder="Optional"
                  style={inputStyle}
                />
              </div>

              {/* Fitness Goal */}

              <div>
                <label style={labelStyle}>
                  Fitness Goal
                </label>

                <select
                  value={fitnessGoal}
                  onChange={(e) =>
                    setFitnessGoal(e.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Select a goal
                  </option>

                  <option value="LOSE_WEIGHT">
                    Lose Weight
                  </option>

                  <option value="BUILD_MUSCLE">
                    Build Muscle
                  </option>

                  <option value="MAINTAIN_WEIGHT">
                    Maintain Weight
                  </option>

                  <option value="IMPROVE_FITNESS">
                    Improve Fitness
                  </option>
                </select>
              </div>

              {/* Activity Level */}

              <div>
                <label style={labelStyle}>
                  Activity Level
                </label>

                <select
                  value={activityLevel}
                  onChange={(e) =>
                    setActivityLevel(e.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Select activity level
                  </option>

                  <option value="SEDENTARY">
                    Sedentary
                  </option>

                  <option value="LIGHT">
                    Light
                  </option>

                  <option value="MODERATE">
                    Moderate
                  </option>

                  <option value="VERY_ACTIVE">
                    Very Active
                  </option>
                </select>
              </div>

              {/* Training Experience */}

              <div>
                <label style={labelStyle}>
                  Training Experience
                </label>

                <select
                  value={trainingExperience}
                  onChange={(e) =>
                    setTrainingExperience(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Select experience
                  </option>

                  <option value="BEGINNER">
                    Beginner
                  </option>

                  <option value="INTERMEDIATE">
                    Intermediate
                  </option>

                  <option value="ADVANCED">
                    Advanced
                  </option>
                </select>
              </div>

              {/* Training Days */}

              <div>
                <label style={labelStyle}>
                  Training Days per Week
                </label>

                <input
                  type="number"
                  value={preferredTrainingDays}
                  onChange={(e) =>
                    setPreferredTrainingDays(
                      e.target.value
                    )
                  }
                  min="1"
                  max="7"
                  placeholder="Optional"
                  style={inputStyle}
                />
              </div>
            </div>
          </section>

          {/* ========================================
              PROFILE SAVE AREA
          ======================================== */}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "14px",
            }}
          >
            {message && (
              <span
                style={{
                  padding: "8px 12px",
                  borderRadius: "7px",
                  background: message.includes(
                    "success"
                  )
                    ? colors.greenLight
                    : "#fef3f2",
                  color: message.includes(
                    "success"
                  )
                    ? colors.green
                    : "#b42318",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {message}
              </span>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                background: colors.blue,
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
                opacity: saving ? 0.7 : 1,
                boxShadow:
                  "0 2px 5px rgba(37, 99, 235, 0.25)",
              }}
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>

        {/* ========================================
            WEIGHT TRACKING
        ======================================== */}

        <section style={cardStyle}>
          {/* Section Header */}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "4px",
                minHeight: "42px",
                borderRadius: "4px",
                background: colors.blue,
              }}
            />

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  color: colors.navy,
                }}
              >
                Weight Tracking
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: colors.muted,
                  fontSize: "13px",
                }}
              >
                Track your weight over time.
              </p>
            </div>
          </div>

          {/* Current Weight */}

          <div
            style={{
              padding: "18px",
              marginBottom: "22px",
              borderRadius: "10px",
              background: colors.blueLight,
              border: `1px solid ${colors.blueBorder}`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                fontWeight: 600,
                color: colors.muted,
              }}
            >
              Current Weight
            </p>

            <p
              style={{
                margin: "5px 0 0",
                fontSize: "28px",
                fontWeight: 700,
                color: colors.navy,
              }}
            >
              {profile.weight != null
                ? `${profile.weight} kg`
                : "Not recorded"}
            </p>
          </div>

          {/* Add Weight Form */}

          <form
            onSubmit={handleAddWeight}
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>
                Add New Weight (kg)
              </label>

              <input
                type="number"
                value={newWeight}
                onChange={(e) =>
                  setNewWeight(e.target.value)
                }
                min="10"
                max="500"
                step="0.1"
                placeholder="Enter weight"
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={weightSaving}
              style={{
                border: "none",
                borderRadius: "8px",
                padding: "12px 20px",
                background: colors.blue,
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: weightSaving
                  ? "not-allowed"
                  : "pointer",
                opacity: weightSaving ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {weightSaving
                ? "Adding..."
                : "Add Weight"}
            </button>
          </form>

          {/* Weight Message */}

          {weightMessage && (
            <div
              style={{
                marginBottom: "20px",
                padding: "9px 12px",
                borderRadius: "7px",
                background: weightMessage.includes(
                  "success"
                )
                  ? colors.greenLight
                  : "#fef3f2",
                color: weightMessage.includes(
                  "success"
                )
                  ? colors.green
                  : "#b42318",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {weightMessage}
            </div>
          )}

          {/* Weight History */}

          <div>
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                fontWeight: 700,
                color: colors.navy,
              }}
            >
              Recent History
            </h3>

            {weightLoading ? (
              <p
                style={{
                  margin: 0,
                  color: colors.muted,
                  fontSize: "13px",
                }}
              >
                Loading weight history...
              </p>
            ) : weightHistory.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  padding: "16px",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  color: colors.muted,
                  fontSize: "13px",
                }}
              >
                No weight records yet.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {weightHistory
                  .slice(0, 10)
                  .map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                        padding: "12px 14px",
                        borderRadius: "8px",
                        background: "#f8fafc",
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          color: colors.muted,
                        }}
                      >
                        {new Date(
                          entry.recordedAt
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </span>

                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: colors.navy,
                        }}
                      >
                        {entry.weight} kg
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}