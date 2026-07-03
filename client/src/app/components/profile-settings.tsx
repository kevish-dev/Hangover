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
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
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
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

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
      
      // Clean up empty strings to null for backend
      const payload: Partial<UserProfile> = {};
      Object.keys(profile).forEach((k) => {
        const key = k as keyof UserProfile;
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
    if (!frontFile && !backFile) {
      toast.error("Please select at least one image to upload.");
      return;
    }
    setUploading(true);
    try {
      const updated = await uploadGovtId(govtIdType, frontFile, backFile);
      setProfile((prev) => ({
        ...prev,
        govtIdType: updated.govtIdType,
        govtIdFrontImageUrl: updated.govtIdFrontImageUrl,
        govtIdBackImageUrl: updated.govtIdBackImageUrl,
      }));
      setFrontFile(null);
      setBackFile(null);
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
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Basic Info */}
      <SectionCard title="Basic Information" icon={User}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="grid-cols-1 md:grid-cols-2">
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
              style={inputBase}
              value={profile.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+91"
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="grid-cols-1 md:grid-cols-2">
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }} className="grid-cols-1 md:grid-cols-2">
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "40px" }}>
        <button
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
        <p style={{ color: "rgba(30,26,20,0.6)", fontSize: "0.8rem", marginBottom: "20px" }}>
          A valid Government ID is required to book trips. This is securely stored and only used for verification and permit purposes.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Field label="ID Type">
            <select
              style={{ ...inputBase, appearance: "auto", maxWidth: "300px" }}
              value={govtIdType}
              onChange={(e) => setGovtIdType(e.target.value as "AADHAAR" | "PASSPORT")}
            >
              <option value="AADHAAR">Aadhaar Card</option>
              <option value="PASSPORT">Passport</option>
            </select>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="grid-cols-1 md:grid-cols-2">
            {/* Front Image */}
            <div
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
              }}
            >
              {profile.govtIdFrontImageUrl ? (
                <>
                  <div style={{ width: "100%", height: "140px", borderRadius: "8px", overflow: "hidden", marginBottom: "10px" }}>
                    <img src={profile.govtIdFrontImageUrl} alt="Front ID" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#228b22", fontWeight: 500 }}>✓ Uploaded</span>
                </>
              ) : (
                <>
                  <ImageIcon size={32} color="rgba(30,26,20,0.2)" />
                  <span style={{ fontSize: "0.85rem", color: "rgba(30,26,20,0.6)" }}>Front Side</span>
                </>
              )}
              <label
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
                {frontFile ? frontFile.name : (profile.govtIdFrontImageUrl ? "Replace Image" : "Select Image")}
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) setFrontFile(e.target.files[0]);
                  }}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {/* Back Image */}
            <div
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
              }}
            >
              {profile.govtIdBackImageUrl ? (
                <>
                  <div style={{ width: "100%", height: "140px", borderRadius: "8px", overflow: "hidden", marginBottom: "10px" }}>
                    <img src={profile.govtIdBackImageUrl} alt="Back ID" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#228b22", fontWeight: 500 }}>✓ Uploaded</span>
                </>
              ) : (
                <>
                  <ImageIcon size={32} color="rgba(30,26,20,0.2)" />
                  <span style={{ fontSize: "0.85rem", color: "rgba(30,26,20,0.6)" }}>Back Side</span>
                </>
              )}
              <label
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
                {backFile ? backFile.name : (profile.govtIdBackImageUrl ? "Replace Image" : "Select Image")}
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) setBackFile(e.target.files[0]);
                  }}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          {(frontFile || backFile) && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
              <button
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
                {uploading ? "Uploading..." : "Upload Selected Images"}
              </button>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
