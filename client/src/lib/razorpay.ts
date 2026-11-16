type RazorpayConstructor = new (options: any) => {
  on: (event: string, handler: (response: any) => void) => void;
  open: () => void;
};

const checkoutWindow = window as Window & { Razorpay?: RazorpayConstructor };
let checkoutScript: Promise<RazorpayConstructor> | undefined;

export function loadRazorpay(): Promise<RazorpayConstructor> {
  if (checkoutWindow.Razorpay) return Promise.resolve(checkoutWindow.Razorpay);
  checkoutScript ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    const fail = () => {
      window.clearTimeout(timeout);
      script.onerror = null;
      script.onload = null;
      script.remove();
      checkoutScript = undefined;
      reject(new Error("Secure checkout could not load. Check your connection and try paying again."));
    };
    const timeout = window.setTimeout(fail, 15_000);

    script.onerror = fail;
    script.onload = () => {
      const Razorpay = checkoutWindow.Razorpay;
      if (!Razorpay) return fail();
      window.clearTimeout(timeout);
      resolve(Razorpay);
    };

    document.head.append(script);
  });
  return checkoutScript;
}
