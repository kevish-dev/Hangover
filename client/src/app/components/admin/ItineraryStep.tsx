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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Day-by-Day Itinerary</h3>
          <p className="text-sm text-gray-500">
            Define the daily activities.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => append({ day: `Day ${fields.length + 1}`, title: "", activities: "" })}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
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
            <div key={day.id} className="p-4 md:p-5 border rounded-xl bg-white shadow-sm flex flex-col gap-4 relative">
              <Button
                type="button"
                variant="ghost"
                onClick={() => remove(index)}
                className="absolute top-4 right-4 text-red-500 hover:bg-red-50 hover:text-red-600 px-3"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-10 md:mr-12">
                <div>
                  <Label className="text-sm font-semibold">Day (e.g. Day 1)</Label>
                  <Input
                    type="text"
                    {...register(`itinerary.${index}.day`)}
                    className="mt-1"
                    placeholder="Day 1"
                  />
                  {(errors.itinerary as any)?.[index]?.day && (
                    <p className="text-xs text-red-500 mt-1">
                      {(errors.itinerary as any)[index].day.message as string}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-semibold">Title</Label>
                  <Input
                    type="text"
                    {...register(`itinerary.${index}.title`)}
                    className="mt-1"
                    placeholder="Welcome to the Northeast"
                  />
                  {(errors.itinerary as any)?.[index]?.title && (
                    <p className="text-xs text-red-500 mt-1">
                      {(errors.itinerary as any)[index].title.message as string}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold">Activities</Label>
                <Textarea
                  {...register(`itinerary.${index}.activities`)}
                  className="mt-1 min-h-[100px]"
                  placeholder="Arrival & pickup from Guwahati Airport...&#10;Scenic 8-hr drive..."
                />
                {(errors.itinerary as any)?.[index]?.activities && (
                  <p className="text-xs text-red-500 mt-1">
                    {(errors.itinerary as any)[index].activities.message as string}
                  </p>
                )}
              </div>
            </div>
          ))}
          <Button
            type="button"
            onClick={() => append({ day: `Day ${fields.length + 1}`, title: "", activities: "" })}
            variant="outline"
            className="w-full mt-2 border-dashed border-2 py-6 text-gray-500 hover:text-gray-900 flex justify-center items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Day
          </Button>
        </div>
      )}
    </div>
  );
}
