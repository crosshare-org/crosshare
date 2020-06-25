declare module "worker-loader?name=static/[hash].worker.js!*" {
  class WebpackWorker extends Worker {
    constructor();
  }

  export default WebpackWorker;
}
