import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { apiClient } from "../../../lib/axios";
import { uploadGenericImageDirect, uploadMultipleGenericImagesDirect } from "../../../lib/directImageUpload";
import { toast } from "sonner";
import { Loader2, UploadCloud, X } from "lucide-react";

interface DestinationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: any | null;
}

type MediaImage = { url: string; caption?: string };
type HighlightItem = { imageUrl?: string | null; text: string; caption?: string | null };

const normalizeImages = (rawImages: any, coverUrl?: string | null): MediaImage[] => {
  let parsed: any[] = [];
  if (Array.isArray(rawImages)) {
    parsed = rawImages;
  } else if (typeof rawImages === "string" && rawImages.trim()) {
    try {
      parsed = JSON.parse(rawImages);
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch (e) {}
      }
    } catch (e) {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed)) parsed = [];

  const list: MediaImage[] = parsed
    .map((img: any) => {
      if (typeof img === "string") return { url: img.trim(), caption: "" };
      if (!img || typeof img !== "object") return null;
      const url = (img.url || img.imageUrl || img.src || "").trim();
      const caption = (img.caption || img.text || img.description || img.title || "").trim();
      if (!url) return null;
      return { url, caption };
    })
    .filter((img): img is MediaImage => Boolean(img && img.url));

  const cleanCover = coverUrl?.trim();
  if (cleanCover && !list.some((img) => img.url === cleanCover)) {
    list.unshift({ url: cleanCover, caption: "" });
  }
  return list;
};

const normalizeHighlights = (rawHighlights: any): HighlightItem[] => {
  let parsed: any[] = [];
  if (Array.isArray(rawHighlights)) {
    parsed = rawHighlights;
  } else if (typeof rawHighlights === "string" && rawHighlights.trim()) {
    try {
      parsed = JSON.parse(rawHighlights);
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch (e) {}
      }
    } catch (e) {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed)) parsed = [];

  return parsed
    .map((h: any) => {
      if (typeof h === "string") return { text: h.trim(), caption: "", imageUrl: null };
      if (!h || typeof h !== "object") return null;
      const text = (h.text || h.title || h.name || (h.caption && !h.imageUrl ? h.caption : "") || h.description || "").trim();
      const caption = (h.caption && h.text ? h.caption : (h.description && h.text ? h.description : "")).trim();
      const imageUrl = (h.imageUrl || h.url || h.image || "").trim() || null;
      if (!text && !caption && !imageUrl) return null;
      return { text: text || caption || "Highlight", caption, imageUrl };
    })
    .filter((h): h is HighlightItem => Boolean(h));
};

export function DestinationFormModal({ open, onOpenChange, destination }: DestinationFormModalProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingHighlightIdx, setUploadingHighlightIdx] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    state: string;
    subheading: string;
    description: string;
    imageUrl: string;
    images: MediaImage[];
    highlights: HighlightItem[];
    isPublished: boolean;
  }>({
    name: "",
    state: "",
    subheading: "",
    description: "",
    imageUrl: "",
    images: [],
    highlights: [],
    isPublished: false,
  });

  useEffect(() => {
    if (destination) {
      const normalizedImages = normalizeImages(destination.images, destination.imageUrl || destination.url);
      const normalizedHighlights = normalizeHighlights(destination.highlights);
      const coverUrl = destination.imageUrl || destination.url || normalizedImages[0]?.url || "";

      setFormData({
        name: destination.name || "",
        state: destination.state || "",
        subheading: destination.subheading || "",
        description: destination.description || "",
        imageUrl: coverUrl,
        images: normalizedImages,
        highlights: normalizedHighlights,
        isPublished: destination.isPublished || false,
      });
    } else {
      setFormData({
        name: "",
        state: "",
        subheading: "",
        description: "",
        imageUrl: "",
        images: [],
        highlights: [],
        isPublished: false,
      });
    }
  }, [destination, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const cleanImages = formData.images.filter((img) => Boolean(img.url.trim()));
    const cleanHighlights = formData.highlights
      .map((h) => ({
        imageUrl: h.imageUrl?.trim() || null,
        text: h.text.trim(),
        caption: h.caption?.trim() || null,
      }))
      .filter((h) => Boolean(h.text || h.imageUrl));

    const payload = {
      name: formData.name.trim(),
      state: formData.state.trim(),
      subheading: formData.subheading.trim() || null,
      description: formData.description.trim() || null,
      isPublished: formData.isPublished,
      images: cleanImages,
      imageUrl: cleanImages[0]?.url || formData.imageUrl.trim() || null,
      highlights: cleanHighlights,
    };
    
    try {
      if (destination) {
        await apiClient.put(`/destinations/${destination.id}`, payload);
        toast.success("Destination updated successfully");
      } else {
        await apiClient.post("/destinations", payload);
        toast.success("Destination created successfully");
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin", "destinations"] });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(destination ? "Failed to update destination" : "Failed to create destination");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100%-0.75rem)] !max-h-[calc(100dvh-0.75rem)] sm:max-w-[650px] overflow-y-auto p-0 border-0 shadow-lg md:!w-full md:!max-h-[90vh]">
        <div className="bg-white p-6 sm:p-8 rounded-lg">
          <DialogHeader className="mb-6">
            <span className="block text-[10px] font-bold tracking-[0.1em] text-[#b59410] uppercase mb-1">
              {destination ? "Update" : "Creation"}
            </span>
            <DialogTitle className="text-2xl font-medium tracking-tight text-gray-900">
              {destination ? "Edit Destination" : "New Destination"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Destination Name</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Swiss Alps"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>
              
              <div>
                <label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">State / Region</label>
                <Input
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g., Valais"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Subheading</label>
                <Textarea
                  name="subheading"
                  value={formData.subheading}
                  onChange={handleChange}
                  placeholder="A short tagline or subheading for the destination..."
                  rows={2}
                  className="flex min-h-[70px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm resize-y disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block">Description (optional)</label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Detailed description of the destination..."
                  rows={3}
                  className="flex min-h-[90px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#b59410]/50 focus:border-[#b59410] transition-colors shadow-sm resize-y disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Images & Captions */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">Images & Captions</span>
                  <span className="text-xs text-gray-500">{formData.images.length} {formData.images.length === 1 ? "image" : "images"}</span>
                </div>

                {formData.images.length > 0 && (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="flex gap-3 items-center p-2.5 rounded-xl border border-gray-200 bg-gray-50/50">
                        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                          <img src={img.url} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-black/70 py-0.5 text-center text-[9px] font-bold text-white uppercase tracking-wider">
                              Cover
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <Input
                            placeholder="Add caption (optional)"
                            value={img.caption || ""}
                            onChange={(e) => {
                              const updated = [...formData.images];
                              updated[idx] = { ...updated[idx], caption: e.target.value };
                              setFormData((prev) => ({ ...prev, images: updated }));
                            }}
                            className="h-8 text-xs bg-white"
                          />
                          <p className="text-[10px] text-gray-400 truncate max-w-[200px] sm:max-w-[320px]" title={img.url}>{img.url}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.images.filter((_, i) => i !== idx);
                            setFormData((prev) => ({ ...prev, images: updated, imageUrl: updated[0]?.url || "" }));
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                          title="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 transition hover:border-[#b59410] hover:bg-white">
                  {uploadingImage ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin text-[#b59410]" />
                      Uploading image…
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <UploadCloud className="h-6 w-6 text-[#b59410]" />
                      <span className="text-sm font-semibold text-gray-700">
                        {formData.images.length > 0 ? "+ Add more images" : "Click to upload images"}
                      </span>
                      <span className="text-xs text-gray-500">Select JPG, PNG, WebP or AVIF files</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      setUploadingImage(true);
                      try {
                        const urls = await uploadMultipleGenericImagesDirect(files);
                        const newEntries: MediaImage[] = urls.map((url) => ({ url, caption: "" }));
                        const updated = [...formData.images, ...newEntries];
                        setFormData((prev) => ({
                          ...prev,
                          images: updated,
                          imageUrl: prev.imageUrl || updated[0]?.url || "",
                        }));
                        toast.success(`${files.length} images uploaded`);
                      } catch (err: any) {
                        toast.error(err?.message || "Failed to upload image");
                      } finally {
                        setUploadingImage(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>

              {/* Highlights & Captions */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">Highlights & Captions</span>
                  <span className="text-xs text-gray-500">{formData.highlights.length} {formData.highlights.length === 1 ? "highlight" : "highlights"}</span>
                </div>

                {formData.highlights.length > 0 && (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {formData.highlights.map((highlight, idx) => (
                      <div key={idx} className="flex flex-col gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-400">Highlight #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.highlights.filter((_, i) => i !== idx);
                              setFormData((prev) => ({ ...prev, highlights: updated }));
                            }}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="space-y-2">
                          <Input
                            required
                            placeholder="Highlight title / text (e.g. Scenic mountain passes)"
                            value={highlight.text}
                            onChange={(e) => {
                              const updated = [...formData.highlights];
                              updated[idx] = { ...updated[idx], text: e.target.value };
                              setFormData((prev) => ({ ...prev, highlights: updated }));
                            }}
                            className="bg-white text-xs h-9"
                          />

                          <Input
                            placeholder="Add caption (optional)"
                            value={highlight.caption || ""}
                            onChange={(e) => {
                              const updated = [...formData.highlights];
                              updated[idx] = { ...updated[idx], caption: e.target.value };
                              setFormData((prev) => ({ ...prev, highlights: updated }));
                            }}
                            className="h-8 text-xs bg-white"
                          />

                          <div className="flex items-center gap-3">
                            {highlight.imageUrl ? (
                              <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                                <img src={highlight.imageUrl} alt={`Highlight ${idx + 1}`} className="h-full w-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...formData.highlights];
                                    updated[idx] = { ...updated[idx], imageUrl: null };
                                    setFormData((prev) => ({ ...prev, highlights: updated }));
                                  }}
                                  className="absolute top-0.5 right-0.5 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
                                  title="Remove image"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex h-14 w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white hover:border-[#b59410] transition">
                                {uploadingHighlightIdx === idx ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-[#b59410]" />
                                ) : (
                                  <>
                                    <UploadCloud className="h-4 w-4 text-gray-400" />
                                    <span className="text-[9px] text-gray-500 font-semibold mt-0.5">Upload</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingHighlightIdx !== null}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingHighlightIdx(idx);
                                    try {
                                      const url = await uploadGenericImageDirect(file);
                                      const updated = [...formData.highlights];
                                      updated[idx] = { ...updated[idx], imageUrl: url };
                                      setFormData((prev) => ({ ...prev, highlights: updated }));
                                      toast.success("Highlight image uploaded");
                                    } catch (err: any) {
                                      toast.error(err?.message || "Failed to upload image");
                                    } finally {
                                      setUploadingHighlightIdx(null);
                                    }
                                  }}
                                />
                              </label>
                            )}
                            <div className="flex-1 min-w-0 text-xs text-gray-500">
                              {highlight.imageUrl ? (
                                <span className="truncate block max-w-[180px] sm:max-w-[280px]" title={highlight.imageUrl}>{highlight.imageUrl}</span>
                              ) : (
                                <span>Image for this highlight (optional).</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, highlights: [...prev.highlights, { text: "", caption: "", imageUrl: null }] }));
                  }}
                  className="w-full text-xs font-semibold py-1.5 h-8 border-dashed"
                >
                  + Add Highlight
                </Button>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="isPublished"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                  className="w-4 h-4 text-[#b59410] rounded border-gray-300 focus:ring-[#b59410]"
                />
                <label htmlFor="isPublished" className="text-sm text-gray-700 cursor-pointer">Publish destination to public site</label>
              </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3 pt-8 border-t border-gray-100 mt-8">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full md:w-auto text-gray-500 hover:text-gray-900">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || uploadingImage || uploadingHighlightIdx !== null} className="w-full md:w-auto bg-[#b59410] hover:bg-[#8a710c] text-white">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  destination ? "Update Destination" : "Create Destination"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
