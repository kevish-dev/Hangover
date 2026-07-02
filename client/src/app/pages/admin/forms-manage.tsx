import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { 
  ChevronLeft, ChevronRight, ArrowLeft, User, FileText, Download, 
  Plus, Edit2, Trash2, Save, GripVertical, Settings2 
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";

export default function AdminFormsManagePage() {
  const { tripId } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"builder" | "submissions">("builder");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Field Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [formData, setFormData] = useState({
    label: "",
    fieldKey: "",
    isCustomKey: false,
    fieldType: "TEXT",
    scope: "TRAVELER",
    isRequired: false,
    options: "",
    placeholder: "",
    helpText: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addAnotherAfterSave, setAddAnotherAfterSave] = useState(false);
  const [orderedFields, setOrderedFields] = useState<any[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Queries
  const { data: tripData } = useQuery({
    queryKey: ["admin", "trips", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/trips/${tripId}`);
      return res.data;
    },
    enabled: !!tripId,
  });

  const { data: fieldsData, isLoading: isLoadingFields } = useQuery({
    queryKey: ["admin", "trip-forms", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/trips/${tripId}/forms`);
      return res.data;
    },
    enabled: !!tripId,
  });

  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ["admin", "trip-submissions", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/trips/${tripId}/forms/submissions`);
      return res.data;
    },
    enabled: !!tripId && activeTab === "submissions",
  });

  useEffect(() => {
    if (fieldsData) {
      setOrderedFields(fieldsData);
    }
  }, [fieldsData]);

  const trip = tripData?.data;
  const fields = fieldsData || [];
  const submissions = submissionsData || [];
  const currentSubmission = submissions[currentIndex];

  // Mutations
  const createFieldMutation = useMutation({
    mutationFn: async (data: any) => apiClient.post(`/trips/${tripId}/forms`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "trip-forms", tripId] });
      toast.success("Field added successfully", { position: "bottom-right" });
      if (addAnotherAfterSave) {
        setFormData({
          label: "", fieldKey: "", isCustomKey: false, fieldType: "TEXT", 
          scope: "TRAVELER", isRequired: false, options: "", placeholder: "", helpText: ""
        });
      } else {
        closeModal();
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to add field", { position: "bottom-right" }),
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => apiClient.put(`/trips/${tripId}/forms/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "trip-forms", tripId] });
      toast.success("Field updated successfully", { position: "bottom-right" });
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update field", { position: "bottom-right" }),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/trips/${tripId}/forms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "trip-forms", tripId] });
      toast.success("Field deleted", { position: "bottom-right" });
    },
    onError: () => toast.error("Failed to delete field", { position: "bottom-right" }),
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (fieldIds: string[]) => apiClient.put(`/trips/${tripId}/forms/reorder`, { fieldIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "trip-forms", tripId] });
      toast.success("Order updated", { position: "bottom-right" });
    },
    onError: () => toast.error("Failed to update order", { position: "bottom-right" }),
  });

  // Handlers
  const openModal = (field?: any) => {
    if (field) {
      setEditingField(field);
      setFormData({
        label: field.label,
        fieldKey: field.fieldKey,
        isCustomKey: true,
        fieldType: field.fieldType,
        scope: field.scope,
        isRequired: field.isRequired,
        options: field.options ? field.options.join(", ") : "",
        placeholder: field.placeholder || "",
        helpText: field.helpText || "",
      });
    } else {
      setEditingField(null);
      setFormData({
        label: "",
        fieldKey: "",
        isCustomKey: false,
        fieldType: "TEXT",
        scope: "TRAVELER",
        isRequired: false,
        options: "",
        placeholder: "",
        helpText: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingField(null);
  };

  const handleSaveField = (addAnother: boolean = false) => {
    if (!formData.label || !formData.fieldKey) {
      toast.error("Label and Field Key are required", { position: "bottom-right" });
      return;
    }
    
    setIsSubmitting(true);
    setAddAnotherAfterSave(addAnother);
    
    const payload = {
      label: formData.label,
      fieldKey: formData.fieldKey,
      fieldType: formData.fieldType,
      scope: formData.scope,
      isRequired: formData.isRequired,
      options: formData.options.split(",").map(s => s.trim()).filter(Boolean),
      placeholder: formData.placeholder,
      helpText: formData.helpText
    };

    if (editingField) {
      updateFieldMutation.mutate({ id: editingField.id, data: payload }, { onSettled: () => setIsSubmitting(false) });
    } else {
      createFieldMutation.mutate(payload, { onSettled: () => setIsSubmitting(false) });
    }
  };

  const confirmDelete = (id: string) => {
    toast("Delete Form Field?", {
      description: "This will remove the field from future intake forms.",
      position: "bottom-right",
      action: {
        label: "Delete",
        onClick: () => deleteFieldMutation.mutate(id)
      },
      cancel: { label: "Cancel", onClick: () => {} }
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newFields = [...orderedFields];
    const [removed] = newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, removed);
    
    setOrderedFields(newFields);
    setDraggedIndex(null);
    
    updateOrderMutation.mutate(newFields.map(f => f.id));
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <Link to="/dashboard/forms" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Forms
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          {trip ? trip.title : "Trip"}
        </h1>
        <p className="text-gray-500 mt-1">Manage intake form fields and view traveler submissions.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-max mb-8">
        <button
          onClick={() => setActiveTab("builder")}
          className={`px-6 py-2.5 rounded-md text-sm font-semibold transition-all ${
            activeTab === "builder" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Form Builder
        </button>
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-6 py-2.5 rounded-md text-sm font-semibold transition-all ${
            activeTab === "submissions" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Submissions
        </button>
      </div>

      {/* Form Builder Tab */}
      {activeTab === "builder" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Custom Fields</h2>
            <Button onClick={() => openModal()} className="bg-[#781216] hover:bg-[#5a0d10] text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Field
            </Button>
          </div>

          {isLoadingFields ? (
            <div className="text-gray-500 p-8 text-center bg-white rounded-xl border border-gray-200">Loading fields...</div>
          ) : fields.length === 0 ? (
            <div className="bg-white border border-gray-200 border-dashed rounded-xl p-12 text-center">
              <Settings2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No custom fields</h3>
              <p className="text-gray-500 mt-1">Add custom fields to collect additional information from travelers during booking.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                <div className="col-span-1"></div>
                <div className="col-span-4">Label & Key</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Scope</div>
                <div className="col-span-1 text-center">Required</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              <div className="divide-y divide-gray-100">
                {orderedFields.map((field: any, index: number) => (
                  <div 
                    key={field.id} 
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    className={`grid grid-cols-12 gap-4 p-4 items-center group hover:bg-gray-50 transition-colors ${draggedIndex === index ? 'opacity-50' : ''}`}
                  >
                    <div className="col-span-1 text-gray-300 flex items-center justify-center">
                      <GripVertical className="w-5 h-5 cursor-grab" />
                    </div>
                    <div className="col-span-4">
                      <p className="font-semibold text-gray-900 truncate">{field.label}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{field.fieldKey}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold">{field.fieldType}</span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600">
                      {field.scope === 'GROUP' ? 'Per Booking' : 'Per Traveler'}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {field.isRequired ? (
                        <span className="w-2 h-2 rounded-full bg-green-500" title="Required"></span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-gray-300" title="Optional"></span>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(field)} className="p-2 text-gray-500 hover:text-[#c8a96e] bg-white rounded-md border border-gray-200 shadow-sm transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => confirmDelete(field.id)} className="p-2 text-gray-500 hover:text-red-600 bg-white rounded-md border border-gray-200 shadow-sm transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === "submissions" && (
        <div className="space-y-6">
          {isLoadingSubmissions ? (
            <div className="text-gray-500 p-8 text-center bg-white rounded-xl border border-gray-200">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No submissions yet</h3>
              <p className="text-gray-500">When travelers book this trip and fill out the form, their responses will appear here.</p>
            </div>
          ) : (
            <>
              {/* Pagination Header (Google Forms Style) */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between sticky top-4 z-10">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium text-gray-700">
                    <span className="text-gray-500 font-normal mr-2">Submission</span>
                    {currentIndex + 1} <span className="text-gray-400 font-normal mx-1">of</span> {submissions.length}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setCurrentIndex(prev => Math.min(submissions.length - 1, prev + 1))}
                    disabled={currentIndex === submissions.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Submission Detail */}
              {currentSubmission && (
                <div className="space-y-6 max-w-3xl mx-auto pt-4">
                  <div className="bg-white border border-gray-200 border-t-4 border-t-[#781216] rounded-xl p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{currentSubmission.travelerName}</h2>
                        <p className="text-sm text-gray-500 mt-1 font-mono bg-gray-50 px-2 py-1 rounded inline-block">Ref: {currentSubmission.bookingId}</p>
                      </div>
                      <div className="bg-[#fcf8f2] text-[#781216] px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Traveler {currentSubmission.travelerIndex + 1}
                      </div>
                    </div>
                  </div>

                  {currentSubmission.responses.map((response: any) => (
                    <div key={response.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm transition-all hover:shadow-md">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">{response.label || "Unknown Field"}</h3>
                      
                      {response.fileUrl ? (
                        <div className="mt-2">
                          <a 
                            href={response.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#fcf8f2] border border-[#e8d5b5] rounded-lg text-sm font-medium text-[#781216] hover:bg-[#f5ead5] transition-colors"
                          >
                            <Download className="w-4 h-4" /> Download Attachment
                          </a>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-800 whitespace-pre-wrap text-[15px] leading-relaxed">
                          {response.value || <span className="text-gray-400 italic">No answer provided</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Field Editor Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl p-8">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl">{editingField ? "Edit Form Field" : "Add Form Field"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Field Label <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.label}
                onChange={e => {
                  const newLabel = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    label: newLabel, 
                    fieldKey: prev.isCustomKey ? prev.fieldKey : newLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')
                  }));
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] transition-all"
                placeholder="e.g., Any dietary restrictions?"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Field Type</label>
                <select 
                  value={formData.fieldType}
                  onChange={e => setFormData({ ...formData, fieldType: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] transition-all"
                >
                  <option value="TEXT">Short Text</option>
                  <option value="TEXTAREA">Paragraph</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Date</option>
                  <option value="SELECT">Dropdown</option>
                  <option value="RADIO">Radio Buttons</option>
                  <option value="CHECKBOX">Checkbox</option>
                  <option value="FILE_UPLOAD">File Upload</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Scope</label>
                <select 
                  value={formData.scope}
                  onChange={e => setFormData({ ...formData, scope: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] transition-all"
                >
                  <option value="TRAVELER">Per Traveler</option>
                  <option value="GROUP">Per Booking (Group)</option>
                </select>
              </div>
            </div>

            {["SELECT", "RADIO", "CHECKBOX", "MULTI_SELECT"].includes(formData.fieldType) && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Options (comma separated) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.options}
                  onChange={e => setFormData({ ...formData, options: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] transition-all"
                  placeholder="e.g., Veg, Non-Veg, Vegan"
                />
              </div>
            )}

            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200 w-max">
                <input 
                  type="checkbox" 
                  id="isRequired"
                  checked={formData.isRequired}
                  onChange={e => setFormData({ ...formData, isRequired: e.target.checked })}
                  className="w-5 h-5 text-[#781216] rounded border-gray-300 focus:ring-[#c8a96e] transition-colors cursor-pointer"
                />
                <label htmlFor="isRequired" className="text-sm font-bold text-gray-800 cursor-pointer select-none">
                  Make this field required
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-8 gap-3 sm:gap-0">
            <Button variant="outline" onClick={closeModal} className="px-6">Cancel</Button>
            <div className="flex items-center gap-3">
              {!editingField && (
                <Button 
                  onClick={() => handleSaveField(true)} 
                  disabled={isSubmitting}
                  variant="outline"
                  className="text-[#781216] border-[#781216] hover:bg-[#fcf8f2] hover:text-[#781216] px-6"
                >
                  {isSubmitting && addAnotherAfterSave ? "Saving..." : "Save & Add Another"}
                </Button>
              )}
              <Button 
                onClick={() => handleSaveField(false)} 
                disabled={isSubmitting}
                className="bg-[#781216] hover:bg-[#5a0d10] text-white px-8 shadow-md"
              >
                {isSubmitting && !addAnotherAfterSave ? "Saving..." : (editingField ? "Update Field" : "Save Field")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
