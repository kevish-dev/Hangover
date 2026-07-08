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

function DayActivities({ nestIndex, control, register, errors }: { nestIndex: number, control: Control<any>, register: UseFormRegister<any>, errors: FieldErrors<any> }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `itinerary.${nestIndex}.activities`
  });

  return (
    <div className="space-y-3 mt-1">
      {fields.map((item, k) => (
        <div key={item.id} className="flex items-start gap-2">
          <div className="w-6 shrink-0 text-center text-sm font-medium text-gray-400 mt-2">{k + 1}.</div>
          <div className="flex-1">
            <Input
              {...register(`itinerary.${nestIndex}.activities.${k}.value`)}
              placeholder="e.g. Arrive at Dibrugarh and drive to Roing..."
            />
            {errors?.itinerary?.[nestIndex]?.activities?.[k]?.value && (
              <p className="text-xs text-red-500 mt-1">
                {errors.itinerary[nestIndex].activities[k].value.message as string}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => remove(k)}
            className="text-red-500 hover:bg-red-50 hover:text-red-600 px-2 h-10"
            disabled={fields.length === 1}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => append({ value: "" })}
        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 mt-1 flex items-center gap-1"
      >
        <Plus className="w-4 h-4" /> Add Activity
      </Button>
    </div>
  );
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
            Define the daily activities.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => append({ dayNumber: fields.length + 1, activities: [{ value: "" }] })}
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
                <DayActivities nestIndex={index} control={control} register={register} errors={errors} />
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
          <Button
            type="button"
            onClick={() => append({ dayNumber: fields.length + 1, activities: [{ value: "" }] })}
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
