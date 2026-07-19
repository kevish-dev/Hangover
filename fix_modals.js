const fs = require('fs');

const files = [
  'client/src/app/components/admin/CircuitFormModal.tsx',
  'client/src/app/components/admin/FestivalFormModal.tsx',
  'client/src/app/components/admin/TripFormModal.tsx'
];

for(let file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Fix schema constraints that block the user
    // inclusions/exclusions in Circuit are just min(1), let's make them optional or min(0)
    content = content.replace(/inclusions:\s*z\.array\(z\.object\(\{ value: z\.string\(\)\.min\(1[^)]*\)\s*\}\)\)\.min\(1[^)]*\)/g, 'inclusions: z.array(z.object({ value: z.string().optional() })).optional()');
    content = content.replace(/exclusions:\s*z\.array\(z\.object\(\{ value: z\.string\(\)\.min\(1[^)]*\)\s*\}\)\)\.min\(1[^)]*\)/g, 'exclusions: z.array(z.object({ value: z.string().optional() })).optional()');
    
    // just in case they are already .min(1) without error message
    content = content.replace(/inclusions:\s*z\.array\(z\.object\(\{ value: z\.string\(\)\.min\(1\) \}\)\)\.min\(1\)/g, 'inclusions: z.array(z.object({ value: z.string().optional() })).optional()');
    content = content.replace(/exclusions:\s*z\.array\(z\.object\(\{ value: z\.string\(\)\.min\(1\) \}\)\)\.min\(1\)/g, 'exclusions: z.array(z.object({ value: z.string().optional() })).optional()');

    // Make duration and operationsReminderDays safe (they are already coerce.number)

    // 2. Rewrite the `next` function in CircuitFormModal
    if (file.includes('CircuitFormModal.tsx')) {
      // Replace the old next function
      const oldNext = `const next = async () => {
    if (await form.trigger(stepFields[step])) {
      setStep((value) => {
        const next = Math.min(STEPS.length - 1, value + 1);
        if (next === STEPS.length - 1) {
          setCanSubmit(false);
          setTimeout(() => setCanSubmit(true), 500);
        }
        return next;
      });
    } else toast.error("Please fix the highlighted fields before continuing.", { description: firstFormError(form.formState.errors) || "Review the required fields on this step." });
  };`;
      const newNext = `const next = async () => {
    const fields = stepFields[step];
    const isStepValid = await form.trigger(fields);
    
    if (isStepValid) {
      setStep((value) => {
        const next = Math.min(STEPS.length - 1, value + 1);
        if (next === STEPS.length - 1) {
          setCanSubmit(false);
          setTimeout(() => setCanSubmit(true), 500);
        }
        return next;
      });
    } else {
      const stepErrors = fields.reduce((acc, field) => {
        const err = form.getFieldState(field).error;
        if (err) acc.push(field);
        return acc;
      }, []);
      
      toast.error(
        <div>
          <p className="font-semibold mb-1">Please fix the following before continuing:</p>
          <ul className="list-disc list-inside space-y-0.5 text-sm">
            {stepErrors.map((m, i) => <li key={i}>{m.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</li>)}
          </ul>
        </div>,
        { position: "bottom-right", duration: 5000 }
      );
    }
  };`;
      // We will do a generic replacement since spacing might differ
      const nextRegex = /const next = async \(\) => \{[\s\S]*?toast\.error\([^\)]+\);\s*\};/m;
      content = content.replace(nextRegex, newNext);
    }

    // 3. Add ErrorText to bestTimeToVisit, duration, operationsReminderDays in CircuitFormModal
    if (file.includes('CircuitFormModal.tsx')) {
      // Replace input for bestTimeToVisit to append ErrorText
      content = content.replace(/\{...form\.register\("bestTimeToVisit"\)\} placeholder="March to June" \/><\/div>/g, '{...form.register("bestTimeToVisit")} placeholder="March to June" /><ErrorText message={form.formState.errors.bestTimeToVisit?.message} /></div>');
      content = content.replace(/\{...form\.register\("duration"\)\} \/><\/div>/g, '{...form.register("duration")} /><ErrorText message={form.formState.errors.duration?.message} /></div>');
      content = content.replace(/\{...form\.register\("operationsReminderDays"\)\} \/><\/div>/g, '{...form.register("operationsReminderDays")} /><ErrorText message={form.formState.errors.operationsReminderDays?.message} /></div>');
    }

    fs.writeFileSync(file, content);
  }
}
