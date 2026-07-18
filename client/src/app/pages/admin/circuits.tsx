import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { CircuitFormModal } from "../../components/admin/CircuitFormModal";
import { Map, Plus, Edit2, Trash2, Navigation, Eye, EyeOff } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

export default function AdminCircuitsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircuit, setEditingCircuit] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "circuits"],
    queryFn: async () => {
      const res = await apiClient.get("/circuits?adminView=true");
      return res.data;
    },
  });

  const confirmAction = (title: string, description: string, actionLabel: string, actionFn: () => Promise<void>) => {
    toast(title, {
      description,
      position: "bottom-right",
      action: { label: actionLabel, onClick: actionFn },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  const handleDelete = (circuitId: string) => {
    confirmAction(
      "Delete Circuit?",
      "Are you sure you want to delete this circuit? This action cannot be undone.",
      "Delete",
      async () => {
        try {
          await apiClient.delete(`/circuits/${circuitId}`);
          toast.success("Circuit deleted successfully");
          queryClient.invalidateQueries({ queryKey: ["admin", "circuits"] });
        } catch (error) {
          toast.error("Failed to delete circuit");
        }
      }
    );
  };

  const handleTogglePublish = (circuit: any) => {
    confirmAction(
      circuit.isActive ? "Deactivate Circuit?" : "Activate Circuit?",
      `Are you sure you want to ${circuit.isActive ? "deactivate" : "activate"} this circuit?`,
      "Confirm",
      async () => {
        try {
          await apiClient.put(`/circuits/${circuit.id}`, { isActive: !circuit.isActive });
          toast.success(circuit.isActive ? "Circuit deactivated" : "Circuit activated");
          queryClient.invalidateQueries({ queryKey: ["admin", "circuits"] });
        } catch (error) {
          toast.error("Failed to update status");
        }
      }
    );
  };

  const openCreateModal = () => {
    setEditingCircuit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (circuit: any) => {
    setEditingCircuit(circuit);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="p-8 text-gray-500">Loading circuits...</div>;
  }

  const circuits = data?.data || [];

  return (
    <div className="w-full">
      <div className="flex flex-col items-stretch md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Map className="w-6 h-6 text-[#c8a96e]" />
            Circuits
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your main circuits and itineraries.
          </p>
        </div>
        <Button onClick={openCreateModal} className="w-full md:w-auto bg-[#c8a96e] hover:bg-[#b8943a] text-white flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Create Circuit
        </Button>
      </div>

      <CircuitFormModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        circuit={editingCircuit} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {circuits.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white border border-gray-200 border-dashed rounded-xl">
            <p className="text-gray-500">No circuits found. Create your first circuit above!</p>
          </div>
        ) : (
          circuits.map((circuit: any) => (
            <div key={circuit.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col group hover:shadow-md transition-shadow relative">
              <div className="p-5 flex-1 flex flex-col">
                {!circuit.isActive && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-red-100 text-red-700 rounded text-xs font-bold uppercase tracking-wider">
                    Draft
                  </div>
                )}
                <h3 className="font-bold text-lg text-gray-900 leading-tight line-clamp-1 pr-14">{circuit.title}</h3>
                <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-2">
                  <Navigation className="w-4 h-4 shrink-0" />
                  <span className="truncate">{circuit.location}</span>
                </div>
                
                <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                  {circuit.overview}
                </p>

                <div className="mt-4 text-sm flex gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
                    {circuit.duration} Days
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
                    ₹{circuit.basePrice}
                  </span>
                </div>
                
                <div className="mt-auto pt-4 flex flex-wrap items-center justify-start md:justify-end gap-3 md:gap-2 border-t border-gray-100 mt-6">
                  <button 
                    onClick={() => handleTogglePublish(circuit)}
                    className={`text-sm font-medium transition-colors flex items-center gap-1 ${circuit.isActive ? 'text-gray-500 hover:text-orange-600' : 'text-gray-500 hover:text-green-600'}`}
                  >
                    {circuit.isActive ? <><EyeOff className="w-3.5 h-3.5" /> Deactivate</> : <><Eye className="w-3.5 h-3.5" /> Activate</>}
                  </button>
                  <div className="hidden md:block w-px h-3 bg-gray-300 mx-1" />
                  <button 
                    onClick={() => openEditModal(circuit)}
                    className="text-sm font-medium text-gray-500 hover:text-[#c8a96e] transition-colors flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <div className="hidden md:block w-px h-3 bg-gray-300 mx-1" />
                  <button 
                    onClick={() => handleDelete(circuit.id)}
                    className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
