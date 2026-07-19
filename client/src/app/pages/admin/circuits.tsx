import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { CircuitFormModal } from "../../components/admin/CircuitFormModal";
import { TripFormModal } from "../../components/admin/TripFormModal";
import { FestivalFormModal } from "../../components/admin/FestivalFormModal";
import { Map, Plus, Edit2, Trash2, Navigation, Eye, EyeOff, Rocket, Loader2, ClipboardList, CalendarDays, Tent } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { getErrorMessage, showErrorToast } from "../../../lib/errors";

export default function AdminCircuitsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCircuit, setEditingCircuit] = useState<any>(null);
  const [sourceCircuit, setSourceCircuit] = useState<any>(null);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isFestivalModalOpen, setIsFestivalModalOpen] = useState(false);
  const [loadingCircuitId, setLoadingCircuitId] = useState<string | null>(null);

  const circuitsQuery = useQuery({
    queryKey: ["admin", "circuits"],
    queryFn: async () => {
      const res = await apiClient.get("/circuits", { params: { adminView: true, limit: 200 } });
      return res.data;
    },
  });
  const { data, isLoading } = circuitsQuery;
  useEffect(() => {
    if (circuitsQuery.isError) toast.error(getErrorMessage(circuitsQuery.error, "Circuits could not be loaded"), { id: "admin-circuits-load-error" });
  }, [circuitsQuery.error, circuitsQuery.isError]);

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
          showErrorToast(error, "Failed to delete circuit");
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
          showErrorToast(error, "Failed to update circuit status");
        }
      }
    );
  };

  const openCreateModal = () => {
    setEditingCircuit(null);
    setIsModalOpen(true);
  };

  const loadFullCircuit = async (circuitId: string) => {
    setLoadingCircuitId(circuitId);
    try {
      return (await apiClient.get(`/circuits/${circuitId}`)).data;
    } finally {
      setLoadingCircuitId(null);
    }
  };

  const openEditModal = async (circuit: any) => {
    try {
      setEditingCircuit(await loadFullCircuit(circuit.id));
      setIsModalOpen(true);
    } catch (error) {
      showErrorToast(error, "Could not load the circuit template");
    }
  };

  const openTripFromCircuit = async (circuit: any) => {
    try {
      setSourceCircuit(await loadFullCircuit(circuit.id));
      setIsTripModalOpen(true);
    } catch (error) {
      showErrorToast(error, "Could not prepare a trip from this circuit");
    }
  };

  const openFestivalFromCircuit = async (circuit: any) => {
    try {
      setSourceCircuit(await loadFullCircuit(circuit.id));
      setIsFestivalModalOpen(true);
    } catch (error) {
      showErrorToast(error, "Could not prepare a festival from this circuit");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-gray-500">Loading circuits...</div>;
  }
  if (circuitsQuery.isError) {
    return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"><p className="font-bold">Circuits could not be loaded.</p><button type="button" onClick={() => circuitsQuery.refetch()} className="mt-3 text-sm font-semibold underline">Try again</button></div>;
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
      <TripFormModal
        open={isTripModalOpen}
        onOpenChange={setIsTripModalOpen}
        sourceCircuit={sourceCircuit}
      />
      <FestivalFormModal
        open={isFestivalModalOpen}
        onOpenChange={setIsFestivalModalOpen}
        sourceCircuit={sourceCircuit}
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
                    ₹{circuit.packages?.[0]?.price || 0}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" />{circuit._count?.days || 0} itinerary days</span>
                  <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{circuit._count?.trips || 0} created trips</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => openTripFromCircuit(circuit)}
                    disabled={!circuit.isActive || loadingCircuitId === circuit.id}
                    className="w-full bg-[#781216] text-white hover:bg-[#5f0e11] px-2 text-xs h-9"
                  >
                    {loadingCircuitId === circuit.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Rocket className="mr-1.5 h-3.5 w-3.5" />}
                    Create trip
                  </Button>
                  <Button
                    type="button"
                    onClick={() => openFestivalFromCircuit(circuit)}
                    disabled={!circuit.isActive || loadingCircuitId === circuit.id}
                    className="w-full bg-[#c8a96e] text-white hover:bg-[#b8943a] px-2 text-xs h-9"
                  >
                    {loadingCircuitId === circuit.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Tent className="mr-1.5 h-3.5 w-3.5" />}
                    Create festival
                  </Button>
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
