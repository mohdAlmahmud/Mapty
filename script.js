"use strict";

const menu = document.querySelector(".menu");
const workoutInputs = document.querySelector(".workout-inputs");
const workoutForm = document.querySelector(".workout-inputs form");

const inputType = document.querySelector(".type");
const inputDistance = document.querySelector(".distance");
const inputDuration = document.querySelector(".duration");
const inputCadence = document.querySelector(".cadence");
const inputElevation = document.querySelector(".elevation");

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ["January","February","March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(
      1
    )}  on  ${months[this.date.getMonth()]}  ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run = new Running([39, -12], 5.2, 24, 178);
// console.log(run);

// Application
class App {
  #map;
  #mapEvent;
  #workOut = [];

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    workoutForm.addEventListener("submit", this._newWorkout.bind(this));
    menu.addEventListener("click", this._moveToPopup.bind(this));

     inputType.addEventListener("change", this._toggleElevationField)
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get your position");
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map("map").setView(coords, 13);

    L.tileLayer("https://tile.openstreetmap.fr/hot//{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));

    this.#workOut.forEach((work) => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    workoutInputs.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = "";
    workoutInputs.style.display = "none";
    workoutInputs.classList.add("hidden");
    setTimeout(() => (workoutInputs.style.display = "block"), 1000);
  }

  _toggleElevationField() {
      inputElevation.closest("div").classList.toggle("hidden");
      inputCadence.closest("div").classList.toggle("hidden");
  }

  _newWorkout(e) {
    const validsInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === "running") {
      const cadence = +inputCadence.value;
      if (
        !allPositive(distance, duration, cadence) ||
        !validsInputs(distance, duration, cadence)
      )
        return alert("Inputs have to be positive numbers!");

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !allPositive(distance, duration) ||
        !validsInputs(distance, duration, elevation)
      )
        return alert("Inputs have to be positive numbers!");
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.#workOut.push(workout);
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          // className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <div class="workout ${workout.type}" data-id="${workout.id}">
    <h5>${workout.description}</h5>
    <div class="stat">
            <span>${workout.type === "running" ? "🏃" : "🚴‍♀️"}${
      workout.distance
    } <span>KM</span></span>
            <span>⏱${workout.duration} <span>MIN</span></span>`;

    if (workout.type === "running") {
      html += `
      <span>⚡️${workout.pace.toFixed(1)} <span>MIN/KM</span></span>
      <span>🦶🏼${workout.cadence} <span>SPM</span></span>
    </div>
  </div>`;
    }

      if (workout.type === "cycling") {
        html += `<span>⚡️${workout.speed.toFixed(1)} <span>MIN/KM</span></span>
        <span>⛰ 
        ${workout.elevationGain} <span>M</span></span>
      </div>
    </div>`;
      }

    workoutInputs.insertAdjacentHTML("afterend", html);
    this._hideForm();
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;

    const workout = this.#workOut.find(
      (work) => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workOut));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data) return;
    this.#workOut = data;
    this.#workOut.forEach((work) => this._renderWorkout(work));
  }

  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
