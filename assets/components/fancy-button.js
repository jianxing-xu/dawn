class FancyButton extends HTMLElement {
  app = null;
  vm = null;

  get state() {
    console.log(this.dataset);
    return JSON.parse(this.dataset.state || '{}');
  }

  init() {
    const el = this;
    this.app = Vue.createApp({
      setup: () => {
        console.log(this.state);
        const state = Vue.ref(this.state);

        const increment = () => {
          state.value.count++;
        };

        return {
          state,
          increment,
        };
      },
      template: `<button @click="increment">Click me {{ state.count }} {{ state.message }}</button>`,
    });
    this.vm = this.app.mount(this);
  }

  constructor() {
    super();
    this.init();
  }
}

customElements.define('fancy-button', FancyButton);
