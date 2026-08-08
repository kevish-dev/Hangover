import { useState, useEffect } from "react";
import {
  User,
  MapPin,
  HeartPulse,
  CreditCard,
  Save,
  Loader2,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import {
  getMyProfile,
  updateMyProfile,
  uploadGovtId,
  type UserProfile,
} from "../../lib/profileApi";
import { toast } from "sonner";

// ── Shared styles ─────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "#ffffff",
  border: "1px solid rgba(30,26,20,0.14)",
  borderRadius: "8px",
  fontSize: "0.84rem",
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 400,
  color: "#1e1a14",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s ease",
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="profile-settings-field" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label
        style={{
          color: "#1e1a14",
          fontSize: "0.75rem",
          fontWeight: 500,
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {label} {required && <span style={{ color: "#781216" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div
      className="profile-settings-section"
      style={{
        background: "#ffffff",
        border: "1px solid rgba(30,26,20,0.08)",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
        fontFamily: "'Poppins', sans-serif",
        boxShadow: "0 2px 10px rgba(30,26,20,0.02)",
      }}
    >
      <div className="profile-settings-section-heading" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <Icon size={18} color="#781216" strokeWidth={1.5} />
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#1e1a14" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Profile Settings Component ────────────────────────────────────

export function ProfileSettings() {
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Govt ID local state
  const [govtIdType, setGovtIdType] = useState<"AADHAAR" | "PASSPORT">("AADHAAR");
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    getMyProfile()
      .then((data) => {
        setProfile(data || {});
        if (data?.govtIdType) setGovtIdType(data.govtIdType);
      })
      .catch((err) => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Basic validation if needed
      if (profile.dateOfBirth && isNaN(Date.parse(profile.dateOfBirth))) {
        toast.error("Invalid Date of Birth format.");
        return;
      }

      if (profile.phone) {
        const cleanPhone = profile.phone.replace(/\D/g, "");
        if (cleanPhone.length !== 10) {
          toast.error("Phone number must be exactly 10 digits.");
          setSaving(false);
          return;
        }
      }
      
      // Clean up empty strings to null for backend
      const payload: Partial<UserProfile> = {};
      const editableFields: (keyof UserProfile)[] = [
        "fullName", "phone", "alternatePhone", "dateOfBirth", "gender",
        "addressLine1", "addressLine2", "city", "state", "postalCode", "country",
        "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
        "bloodGroup", "medicalNotes", "govtIdType", "govtIdNumber",
      ];
      editableFields.forEach((key) => {
        const val = profile[key];
        payload[key] = (val === "") ? null : val as any;
      });
      // Convert dateOfBirth to ISO string if it's not already
      if (payload.dateOfBirth) {
        payload.dateOfBirth = new Date(payload.dateOfBirth as string).toISOString();
      }

      const updated = await updateMyProfile(payload);
      setProfile(updated);
      toast.success("Profile saved successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadGovtId = async () => {
    if (!imageFile) {
      toast.error("Please select an image to upload.");
      return;
    }
    setUploading(true);
    try {
      const updated = await uploadGovtId(govtIdType, imageFile);
      setProfile((prev) => ({
        ...prev,
        govtIdType: updated.govtIdType,
        govtIdImageUrl: updated.govtIdImageUrl,
        govtIdMimeType: updated.govtIdMimeType,
      }));
      setImageFile(null);
      toast.success("Government ID uploaded successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload Government ID");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
        <Loader2 size={24} color="#781216" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  // Helper to get simple YYYY-MM-DD for date inputs
  const dobValue = profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split("T")[0] : "";

  return (
    <div className="profile-settings" style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Basic Info */}
      <SectionCard title="Basic Information" icon={User}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="profile-settings-grid grid-cols-1 md:grid-cols-2">
          <Field label="Full Name">
            <input
              type="text"
              style={inputBase}
              value={profile.fullName || ""}
              onChange={(e) => handleChange("fullName", e.target.value)}
              placeholder="e.g., John Doe"
            />
          </Field>
          <Field label="Date of Birth">
            <input
              type="date"
              style={inputBase}
              value={dobValue}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
            />
          </Field>
          <Field label="Phone Number">
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              pattern="[0-9]{10}"
              title="Phone number must be exactly 10 digits"
              style={inputBase}
              value={profile.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
            />
          </Field>
          <Field label="Gender">
            <select
              style={{ ...inputBase, appearance: "auto" }}
              value={profile.gender || ""}
              onChange={(e) => handleChange("gender", e.target.value)}
            >
              <option value="">Select Gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </Field>
        </div>
      </SectionCard>

      {/* Address */}
      <SectionCard title="Address" icon={MapPin}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Field label="Address Line 1">
            <input
              type="text"
              style={inputBase}
              value={profile.addressLine1 || ""}
              onChange={(e) => handleChange("addressLine1", e.target.value)}
              placeholder="Street address, P.O. box, etc."
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="profile-settings-grid grid-cols-1 md:grid-cols-2">
            <Field label="City">
              <input
                type="text"
                style={inputBase}
                value={profile.city || ""}
                onChange={(e) => handleChange("city", e.target.value)}
              />
            </Field>
            <Field label="State / Province">
              <input
                type="text"
                style={inputBase}
                value={profile.state || ""}
                onChange={(e) => handleChange("state", e.target.value)}
              />
            </Field>
            <Field label="Postal / Zip Code">
              <input
                type="text"
                style={inputBase}
                value={profile.postalCode || ""}
                onChange={(e) => handleChange("postalCode", e.target.value)}
              />
            </Field>
            <Field label="Country">
              <input
                type="text"
                style={inputBase}
                value={profile.country || ""}
                onChange={(e) => handleChange("country", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* Emergency & Medical */}
      <SectionCard title="Emergency & Medical" icon={HeartPulse}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }} className="profile-settings-grid grid-cols-1 md:grid-cols-2">
          <Field label="Emergency Contact Name">
            <input
              type="text"
              style={inputBase}
              value={profile.emergencyContactName || ""}
              onChange={(e) => handleChange("emergencyContactName", e.target.value)}
            />
          </Field>
          <Field label="Emergency Contact Phone">
            <input
              type="tel"
              style={inputBase}
              value={profile.emergencyContactPhone || ""}
              onChange={(e) => handleChange("emergencyContactPhone", e.target.value)}
            />
          </Field>
          <Field label="Relation to You">
            <input
              type="text"
              style={inputBase}
              value={profile.emergencyContactRelation || ""}
              onChange={(e) => handleChange("emergencyContactRelation", e.target.value)}
            />
          </Field>
          <Field label="Blood Group">
            <select
              style={{ ...inputBase, appearance: "auto" }}
              value={profile.bloodGroup || ""}
              onChange={(e) => handleChange("bloodGroup", e.target.value)}
            >
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </Field>
        </div>
        <Field label="Medical Notes (Allergies, conditions, etc.)">
          <textarea
            style={{ ...inputBase, resize: "vertical", minHeight: "80px" }}
            value={profile.medicalNotes || ""}
            onChange={(e) => handleChange("medicalNotes", e.target.value)}
            placeholder="Any medical conditions we should be aware of during the trip..."
          />
        </Field>
      </SectionCard>

      {/* Save Button */}
      <div className="profile-settings-save-row" style={{ display: "flex", justifyContent: "flex-end", marginBottom: "40px" }}>
        <button
          className="profile-settings-save-button"
          onClick={handleSaveProfile}
          disabled={saving}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#1e1a14",
            color: "#fff",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontWeight: 500,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "'Poppins', sans-serif",
            transition: "background 0.2s",
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>

      {/* Government ID Upload */}
      <SectionCard title="Government ID" icon={CreditCard}>
        <p className="profile-settings-id-copy" style={{ color: "rgba(30,26,20,0.6)", fontSize: "0.8rem", marginBottom: "20px" }}>
          A valid Government ID is required to book trips. This is securely stored and only used for verification and permit purposes.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Field label="ID Type">
            <select
              className="profile-settings-id-select"
              style={{ ...inputBase, appearance: "auto", maxWidth: "300px" }}
              value={govtIdType}
              onChange={(e) => setGovtIdType(e.target.value as "AADHAAR" | "PASSPORT")}
            >
              <option value="AADHAAR">Aadhaar Card</option>
              <option value="PASSPORT">Passport</option>
            </select>
          </Field>

          <div className="profile-settings-upload-wrap" style={{ display: "flex", justifyContent: "center" }}>
            <div
              className="profile-settings-upload-card"
              style={{
                border: "2px dashed rgba(30,26,20,0.15)",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                position: "relative",
                background: "#faf8f4",
                width: "100%",
                maxWidth: "400px",
              }}
            >
              {profile.govtIdImageUrl ? (
                <>
                  {profile.govtIdMimeType === "application/pdf" ? (
                    <a href={profile.govtIdImageUrl} target="_blank" rel="noreferrer" className="text-sm text-[#781216] underline">View uploaded PDF</a>
                  ) : (
                    <div className="profile-settings-id-preview" style={{ width: "100%", height: "200px", borderRadius: "8px", overflow: "hidden", marginBottom: "10px" }}>
                      <img src={profile.govtIdImageUrl} alt="Government ID" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <span style={{ fontSize: "0.75rem", color: "#228b22", fontWeight: 500 }}>✓ Uploaded</span>
                </>
              ) : (
                <>
                  <ImageIcon size={40} color="rgba(30,26,20,0.2)" />
                  <span style={{ fontSize: "0.85rem", color: "rgba(30,26,20,0.6)" }}>ID Image</span>
                </>
              )}
              <label
                className="profile-settings-file-label"
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(30,26,20,0.2)",
                  padding: "6px 16px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  marginTop: "8px",
                }}
              >
                {imageFile ? imageFile.name : (profile.govtIdImageUrl ? "Replace Image" : "Select Image")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
                  }}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          {imageFile && (
            <div className="profile-settings-upload-action" style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
              <button
                className="profile-settings-upload-button"
                onClick={handleUploadGovtId}
                disabled={uploading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#781216",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: uploading ? "not-allowed" : "pointer",
                  fontFamily: "'Poppins', sans-serif",
                  transition: "background 0.2s",
                }}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? "Uploading..." : "Upload Selected Image"}
              </button>
            </div>
          )}
        </div>
      </SectionCard>
      <style>{`
        @media (max-width: 767px) {
          .profile-settings {
            min-width: 0;
            width: 100%;
          }
          .profile-settings-section {
            padding: 16px !important;
            margin-bottom: 16px !important;
            border-radius: 10px !important;
          }
          .profile-settings-section-heading {
            gap: 8px !important;
            margin-bottom: 16px !important;
          }
          .profile-settings-section-heading h3 {
            font-size: 0.98rem !important;
          }
          .profile-settings-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 12px !important;
          }
          .profile-settings-field {
            min-width: 0;
            gap: 4px !important;
          }
          .profile-settings input,
          .profile-settings select,
          .profile-settings textarea {
            min-height: 44px;
            font-size: 16px !important;
          }
          .profile-settings-save-row {
            margin-bottom: 24px !important;
          }
          .profile-settings-save-button,
          .profile-settings-upload-button {
            justify-content: center;
            min-height: 44px;
            width: 100%;
          }
          .profile-settings-id-copy {
            line-height: 1.6;
            margin-bottom: 16px !important;
          }
          .profile-settings-id-select {
            max-width: none !important;
          }
          .profile-settings-upload-wrap {
            width: 100%;
          }
          .profile-settings-upload-card {
            box-sizing: border-box;
            min-width: 0;
            padding: 14px !important;
            border-radius: 10px !important;
          }
          .profile-settings-id-preview {
            height: 150px !important;
          }
          .profile-settings-file-label {
            box-sizing: border-box;
            max-width: 100%;
            line-height: 1.4;
            overflow-wrap: anywhere;
          }
          .profile-settings-upload-action {
            justify-content: stretch !important;
          }
        }
      `}</style>
    </div>
  );
}
