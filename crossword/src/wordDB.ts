export class DB {
  state = {};

  constructor() {
  };

  loadDB() {
    fetch('_db.json')
    .then((r) => r.json())
    .then((data) => (this.state = data))
  }

  sayHi() {
    console.log("hi");
  }
}
