import React from "react";
import { useFieldArray, Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { Plus, Trash2, CalendarDays, Clock, Map } from "lucide-react";
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
    name: "itineraries",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Itineraries</h3>
          <p className="text-sm text-gray-500">
            Define the day-by-day schedules for this trip.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => append({ title: "Main Itinerary", description: "", days: [] })}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Itinerary
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-500">
          <Map className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm font-medium">No itineraries added yet.</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Itinerary" to start building your schedule.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {fields.map((itinerary, itineraryIndex) => (
            <div key={itinerary.id} className="p-5 border rounded-xl bg-white shadow-sm space-y-5">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">Itinerary Title</Label>
                    <Input
                      {...register(`itineraries.${itineraryIndex}.title`)}
                      placeholder="e.g. Standard 5-Day Trek"
                      className="mt-1"
                    />
                    {errors.itineraries?.[itineraryIndex]?.title && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.itineraries[itineraryIndex].title.message as string}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Description (Optional)</Label>
                    <Textarea
                      {...register(`itineraries.${itineraryIndex}.description`)}
                      placeholder="Overview of this itinerary..."
                      rows={2}
                      className="mt-1 resize-none"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => remove(itineraryIndex)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remove Itinerary
                </Button>
              </div>

              {/* DAYS */}
              <div className="pl-4 border-l-2 border-indigo-100 space-y-4 pt-2">
                <ItineraryDays control={control} register={register} errors={errors} itineraryIndex={itineraryIndex} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ItineraryDays({ control, register, errors, itineraryIndex }: { control: Control<any>, register: UseFormRegister<any>, errors: FieldErrors<any>, itineraryIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `itineraries.${itineraryIndex}.days`,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold text-indigo-900 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" /> Days
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ dayNumber: fields.length + 1, title: "", description: "", activities: [] })}
          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Day
        </Button>
      </div>
      
      {fields.length === 0 && (
        <p className="text-sm text-gray-500 italic">No days added to this itinerary yet.</p>
      )}

      {fields.map((day, dayIndex) => (
        <div key={day.id} className="p-4 border rounded-lg bg-gray-50/50 space-y-4">
          <div className="flex gap-4">
            <div className="w-20 shrink-0">
              <Label className="text-xs">Day #</Label>
              <Input
                type="number"
                {...register(`itineraries.${itineraryIndex}.days.${dayIndex}.dayNumber`)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Day Title</Label>
              <Input
                {...register(`itineraries.${itineraryIndex}.days.${dayIndex}.title`)}
                placeholder="e.g. Arrival in Manali"
                className="mt-1"
              />
              {errors.itineraries?.[itineraryIndex]?.days?.[dayIndex]?.title && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.itineraries[itineraryIndex].days[dayIndex].title.message as string}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(dayIndex)}
              className="mt-6 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div>
            <Label className="text-xs">Day Description</Label>
            <Textarea
              {...register(`itineraries.${itineraryIndex}.days.${dayIndex}.description`)}
              placeholder="What happens on this day?"
              rows={2}
              className="mt-1 resize-none"
            />
          </div>

          {/* ACTIVITIES */}
          <div className="pl-4 border-l-2 border-gray-200 space-y-3 pt-2">
            <ItineraryActivities control={control} register={register} errors={errors} itineraryIndex={itineraryIndex} dayIndex={dayIndex} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ItineraryActivities({ control, register, errors, itineraryIndex, dayIndex }: { control: Control<any>, register: UseFormRegister<any>, errors: FieldErrors<any>, itineraryIndex: number, dayIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `itineraries.${itineraryIndex}.days.${dayIndex}.activities`,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Activities
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => append({ title: "", description: "", time: "" })}
          className="text-gray-500 hover:text-gray-900 h-8"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Activity
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map((activity, activityIndex) => (
          <div key={activity.id} className="flex gap-2 items-start bg-white p-2 border rounded shadow-sm">
            <div className="w-24 shrink-0">
              <Input
                {...register(`itineraries.${itineraryIndex}.days.${dayIndex}.activities.${activityIndex}.time`)}
                placeholder="Time (e.g. 10 AM)"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <Input
                  {...register(`itineraries.${itineraryIndex}.days.${dayIndex}.activities.${activityIndex}.title`)}
                  placeholder="Activity Title"
                  className="h-8 text-sm"
                />
                {errors.itineraries?.[itineraryIndex]?.days?.[dayIndex]?.activities?.[activityIndex]?.title && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.itineraries[itineraryIndex].days[dayIndex].activities[activityIndex].title.message as string}
                  </p>
                )}
              </div>
              <Input
                {...register(`itineraries.${itineraryIndex}.days.${dayIndex}.activities.${activityIndex}.description`)}
                placeholder="Brief description..."
                className="h-8 text-sm text-gray-600"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(activityIndex)}
              className="h-8 w-8 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
