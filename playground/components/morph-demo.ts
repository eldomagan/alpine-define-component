import Alpine from 'alpinejs';

/**
 * Plain Alpine x-data that morphs a container holding an accordion
 * (defineComponent + defineScope) to verify state and part expressions
 * survive Alpine.morph().
 */
export function registerMorphDemo() {
  Alpine.data('morphDemo', () => ({
    morphCount: 0,
    dynamicSection: 'details',

    switchSection() {
      this.dynamicSection = this.dynamicSection === 'details' ? 'extra' : 'details';
    },

    doMorph() {
      this.morphCount++;
      const target = document.getElementById('morph-target');
      if (!target) return;

      const isEven = this.morphCount % 2 === 0;

      Alpine.morph(target, `
        <div id="morph-target">
          <div x-accordion>
            <div x-accordion:item="'intro'" class="accordion-item">
              <button x-accordion:header class="accordion-trigger">Introduction</button>
              <div x-accordion:content class="accordion-content">
                <p>This is the intro section.</p>
              </div>
            </div>
            <div x-accordion:item="dynamicSection" class="accordion-item">
              <button x-accordion:header class="accordion-trigger">Dynamic Item</button>
              <div x-accordion:content class="accordion-content">
                <p>This item's id comes from a reactive variable${isEven ? ' (updated on even morph)' : ''}.</p>
              </div>
            </div>
            ${isEven ? `
              <div x-accordion:item="'extra'" class="accordion-item">
                <button x-accordion:header class="accordion-trigger">Extra (even only)</button>
                <div x-accordion:content class="accordion-content">
                  <p>This section only appears after even morphs.</p>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `);
    },
  }));

  Alpine.data('teleportMorphDemo', () => ({
    morphCount: 0,
    panelOpen: true,

    doMorph() {
      this.morphCount++;
      const target = document.getElementById('teleport-morph-target');
      if (!target) return;

      const isEven = this.morphCount % 2 === 0;

      Alpine.morph(target, `
        <div id="teleport-morph-target" class="teleport-panel">
          <div x-accordion>
            <div x-accordion:item="'alpha'" class="accordion-item">
              <button x-accordion:header class="accordion-trigger">Alpha</button>
              <div x-accordion:content class="accordion-content">
                <p>Alpha section inside teleported content.</p>
              </div>
            </div>
            <div x-accordion:item="'beta'" class="accordion-item">
              <button x-accordion:header class="accordion-trigger">Beta</button>
              <div x-accordion:content class="accordion-content">
                <p>Beta section${isEven ? ' (even morph)' : ''}.</p>
              </div>
            </div>
            ${isEven ? `
              <div x-accordion:item="'gamma'" class="accordion-item">
                <button x-accordion:header class="accordion-trigger">Gamma (even only)</button>
                <div x-accordion:content class="accordion-content">
                  <p>This section appears on even morphs.</p>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `);
    },
  }));
}
