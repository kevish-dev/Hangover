import EventEmitter from "events";

class EmailQueue extends EventEmitter {
  constructor() {
    super();
    this.jobs = [];
    this.isProcessing = false;
  }

  /**
   * Add a job to the queue
   * @param {string} name - Job name e.g. "SEND_VERIFICATION_EMAIL"
   * @param {object} data - Job payload
   */
  add(name, data) {
    this.jobs.push({ name, data });
    this.emit("jobAdded");
  }

  async process(handler) {
    this.on("jobAdded", async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;

      while (this.jobs.length > 0) {
        const job = this.jobs.shift();
        try {
          await handler(job);
        } catch (error) {
          console.error(`Error processing job ${job.name}:`, error);
          // In a real queue (like BullMQ), we'd implement retries here
        }
      }

      this.isProcessing = false;
    });
  }
}

export const emailQueue = new EmailQueue();
