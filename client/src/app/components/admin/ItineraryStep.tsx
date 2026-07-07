import React from "react";
import { useFieldArray, Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { Plus, Trash2, Map } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface ItineraryStepProps {
  control: Control<any>;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
}

export function ItineraryStep({ control, register, errors }: ItineraryStepProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "itinerary",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Day-by-Day Itinerary</h3>
          <p className="text-sm text-gray-500">
            Define the daily activities. You can use bullet points for the activities.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => append({ dayNumber: fields.length + 1, activities: "" })}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Day
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-500">
          <Map className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm font-medium">No itinerary days added yet.</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Day" to start building your schedule.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((day, index) => (
            <div key={day.id} className="p-5 border rounded-xl bg-white shadow-sm flex gap-4 items-start">
              <div className="w-24 shrink-0">
                <Label className="text-sm font-semibold">Day #</Label>
                <Input
                  type="number"
                  {...register(`itinerary.${index}.dayNumber`)}
                  className="mt-1"
                />
                {errors.itinerary?.[index]?.dayNumber && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.itinerary[index].dayNumber.message as string}
                  </p>
                )}
              </div>
              <div className="flex-1">
                <Label className="text-sm font-semibold">Activities</Label>
                <Textarea
                  {...register(`itinerary.${index}.activities`)}
                  placeholder="e.g. Arrive at Dibrugarh and drive to Roing. Explore the local market..."
                  rows={3}
                  className="mt-1 resize-y"
                />
                {errors.itinerary?.[index]?.activities && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.itinerary[index].activities.message as string}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => remove(index)}
                className="mt-6 text-red-500 hover:bg-red-50 hover:text-red-600 px-3"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
