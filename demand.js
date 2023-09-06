// Do not trigger scroll up when clicking on a links
const allNavLinks = document.querySelectorAll('.header-link a');
allNavLinks.forEach((a) => {
  a.addEventListener('click', (event) => {
    event.preventDefault();
  });
});

// Concerns the input type Range
const result = document.querySelector('#result');
const bar = document.querySelector('#bar');

result.value = bar.value + ' %';

bar.addEventListener('input', () => {
  result.textContent = bar.value + ' %';
});

// Drag & Drop zone
const inputFile = document.querySelector('.drop-zone-input');
const dropZone = inputFile.closest('.drop-zone');

Drop('change', inputFile);
Drop('dragover');
Drop('dragleave', undefined, false);
Drop('dragend', undefined, false);
Drop('drop', undefined, false);

function Drop(type, eventTarget = dropZone, addClass = true) {
  eventTarget.addEventListener(type, (e) => {
    e.preventDefault();
    if (addClass) {
      dropZone.classList.add('drop-zone-over');
    } else {
      dropZone.classList.remove('drop-zone-over');
    }

    const currentFile = e.dataTransfer?.files || e.currentTarget.files;
    if (currentFile.length) {
      inputFile.files = currentFile;
      updateThumbnail(currentFile[0]);
    }
  });
}

function updateThumbnail(file) {
  let thumbnailElement = dropZone.querySelector('.drop-zone-thumb');
  dropZone.querySelector('.drop-zone-prompt').classList.add('hidden');

  if (!thumbnailElement) {
    thumbnailElement = document.createElement('div');
    thumbnailElement.classList.add('drop-zone-thumb');
    dropZone.appendChild(thumbnailElement);
  }

  const fileName = file.name.toLowerCase();
  thumbnailElement.dataset.label = fileName;
  thumbnailElement.title = fileName;

  if (file.type.includes('image')) {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      thumbnailElement.style.background = `url('${reader.result}') center / cover rgb(255, 255, 255) no-repeat`;
    };
  } else {
    thumbnailElement.style.backgroundImage = '';
  }
}

const documents = document.querySelector('.documents');
const description = document.querySelector('.content.description input');
const uploadBtn = document.querySelector('.upload button');
uploadBtn.addEventListener('click', () => {
  UploadedDocument();
});

function UploadedDocument() {
  const zoneThumb = document.querySelector('.drop-zone-thumb');
  const dropZonePrompt = dropZone.querySelector('.drop-zone-prompt');

  if (!description || !zoneThumb) {
    addShakeAnimation(uploadBtn);
    return;
  }

  const uploaded = document.createElement('div');
  const icon = document.createElement('i');
  icon.classList.add('fa-solid', 'fa-check');
  uploaded.classList.add('uploaded-container');
  const doc = document.createElement('p');
  doc.textContent = zoneThumb.dataset.label.toLowerCase();
  uploaded.appendChild(doc);
  uploaded.insertBefore(icon, doc);
  documents.appendChild(uploaded);

  zoneThumb?.remove();
  description.value = '';

  const keyframes = [{ opacity: 0 }, { opacity: 1 }];

  dropZonePrompt.classList.remove('hidden');
  dropZonePrompt.animate(keyframes, { duration: 300 });
}

function addShakeAnimation(element) {
  element.classList.add('shake');
  setTimeout(() => {
    element.classList.remove('shake');
  }, 500);
}

// API fetching and handling
let APIurl = '';
let IsEU = false;
let APIGlobalresponse = '';
let alreadyInsertedVAT = '';

class AjaxRequest {
  constructor() {
    this.url = APIurl;
  }

  fetchData() {
    return fetch(this.url);
  }
}

class DOMHandling {
  #name;
  #VATNumber;
  #street;

  constructor(APIres, parentContainer) {
    this.APIres = APIres;
    this.parentContainer = parentContainer;
    this.DOMConstruction();
  }

  DOMConstruction() {
    if (IsEU) {
      this.EUSupplier(this.APIres);
    } else {
      this.BESupplier(this.APIres);

      this.APIres.establishments.forEach((establishment) => {
        this.BESupplier(establishment);
      });
    }

    let delay = 0;
    const keyframes = [{ opacity: 0 }, { opacity: 1 }];

    const results = this.parentContainer.querySelectorAll('.result');
    results.forEach((result) => {
      result.animate(keyframes, {
        duration: 600,
        easing: 'ease-out',
        fill: 'forwards',
        delay,
      });
      delay += 300;

      this.addSelectable(results, result);
    });
  }

  BESupplier(object) {
    const resultContainer = this.parentContainer.querySelector('.result-container');
    if (object.statusDescription && object.statusDescription?.FR !== 'Actif') {
      DOMHandling.AddMessage(resultContainer, 'Client non valide', 'danger');
      return;
    }

    const objectAddress = object.addresses[0];
    if (this.#street === this.LimitFieldLength(objectAddress.streetFR)) return;

    const objectDenomination = object.denominations[0];
    this.#VATNumber ||= object.enterpriseNumber;
    this.#name ||= this.Capitalize(this.LimitFieldLength(objectDenomination.denomination));
    const establishmentNumber = object.establishmentNumber
      ? `<p>N° établissement : ${object.establishmentNumber}</p>`
      : '';

    this.#street = this.LimitFieldLength(objectAddress.streetFR);
    let { houseNumber, zipcode } = objectAddress;
    if (!zipcode) zipcode = '';
    const foreignClient = objectAddress.countryFR ? objectAddress.countryFR : null;

    this.DOMInsertion(
      resultContainer,
      this.#name,
      foreignClient ? this.LimitFieldLength(foreignClient) : 'BE',
      this.#street,
      houseNumber,
      zipcode,
      this.#VATNumber,
      establishmentNumber
    );
  }

  EUSupplier(object) {
    // NL862399373B01
    const resultContainer = document.querySelector('.supplier .result-container');
    if (!object.valid) {
      DOMHandling.AddMessage(
        resultContainer,
        'TVA non valide pour les transactions transfrontières dans l’UE',
        'danger'
      );
      return;
    }

    const objectAddress = object.address;
    const name = this.Capitalize(this.LimitFieldLength(object.name.toLowerCase()));
    const { countryCode, street, number, zip_code } = objectAddress;
    const { vatNumber } = object;

    this.DOMInsertion(resultContainer, name, countryCode, street, number, zip_code, vatNumber);
  }

  DOMInsertion(
    resultContainer,
    name,
    countryCode,
    street,
    houseNumber,
    zipcode,
    VATNumber,
    establishmentNumber = ''
  ) {
    DOMHandling.AddMessage(resultContainer, 'Sélectionnez pour confirmer', 'info');

    resultContainer.insertAdjacentHTML(
      'beforeend',
      `<div class='result'>
    <div class='name'><p>Nom : ${name}</p>
    <span>${countryCode}</span></div>
    <p>Adresse : ${street} ${houseNumber} ${zipcode}</p>
    <p>N° TVA : ${VATNumber}</p>
    ${establishmentNumber}
    </div>`
    );
  }

  static AddMessage(resultContainer, message, type) {
    const errorContainer = resultContainer.querySelector("[class*='message-']");
    if (errorContainer?.innerText === message) {
      return;
    } else if (errorContainer?.innerText === message) {
      DOMHandling.RemoveMessage(resultContainer);
    }

    resultContainer.querySelector('.message-info')?.remove();
    resultContainer.querySelector('.result')?.remove();

    resultContainer.insertAdjacentHTML(
      'beforeend',
      `<div class='message-${type}'>
    <p>${message}</p></div>`
    );

    const parentMessage = resultContainer.querySelector(`.message-${type}`);
    const icon = document.createElement('i');
    if (type === 'danger') {
      icon.classList.add('fa-solid', 'fa-triangle-exclamation');
    } else {
      icon.classList.add('fa-solid', 'fa-circle-info');
    }
    parentMessage.insertBefore(icon, parentMessage.querySelector('p'));
  }

  static RemoveMessage(container = '') {
    this.parentContainer?.querySelector("[class*='message-']")?.remove() ||
      container.querySelector("[class*='message-']")?.remove();
  }

  static ResetContainer(container) {
    container.querySelectorAll(`.result`)?.forEach((result) => {
      result.remove();
    });
  }

  LimitFieldLength(field, limit = 20) {
    if (field.indexOf('(') !== -1) {
      field = field.substring(0, field.indexOf('('));
    }

    if (field.length > limit) {
      let splittedField = field.split(' ');
      field = splittedField[0] + ' ';
      let i = 1;
      while (field.length + splittedField[i]?.length < limit && splittedField[i]) {
        field += splittedField[i] + ' ';
        i++;
      }

      if (!splittedField[i]) return field;
      field += splittedField[i].trim()[0] + '.';
    }
    return field;
  }

  Capitalize(field) {
    const word = field.split(' ');
    let capitalized = '';
    let i = 0;
    while (word[i]) {
      capitalized += word[i][0].toUpperCase() + word[i].substring(1).toLowerCase() + ' ';
      i++;
    }

    return capitalized.trim();
  }

  addSelectable(results, result) {
    result.addEventListener('click', () => {
      result.classList.add('selected');
      DOMHandling.RemoveMessage(this.parentContainer);

      results.forEach((r) => {
        if (!r.classList.contains('selected')) {
          r.classList.add('hidden');
        }
      });
    });
  }
}

const vatButtons = document.querySelectorAll('.vat-number-container button');
const onlyDigits = /^\d+$/;
const inputVATFields = document.querySelectorAll('.vat-number input');
inputVATFields.forEach((input) => {
  input.addEventListener('input', (e) => {
    if (!onlyDigits.test(input.value)) {
      if (e.inputType === 'insertFromPaste') {
        input.value = input.value.replace(/\s|\.|BE/g, '');
        return;
      } else {
        input.value = input.value.replace(e.data, '');
      }
      input.classList.remove('valid');
      input.classList.add('invalid');
      showAsDisabled(true);
    }
    if (input.value.length < 10) {
      input.classList.remove('valid');
      input.classList.add('invalid');
      showAsDisabled(true);
    } else {
      input.classList.remove('invalid');
      input.classList.add('valid');
      showAsDisabled(false);
    }
  });
});

function showAsDisabled(disable) {
  vatButtons.forEach((button) => {
    if (disable) {
      button.style.opacity = 0.7;
    } else {
      button.style.opacity = 1;
    }
  });
}

vatButtons.forEach((vatButton) => {
  vatButton.addEventListener('click', () => {
    const parent = vatButton.closest('.vat-number-container');
    let inputField = parent.querySelector('input');
    // Sanitize spaces and . character
    inputField.value = inputField.value.replace(/\s|\.|BE/g, '');
    const container = parent.parentNode;
    const code = document.querySelector('.prefix select').value;

    inputField.classList.remove('invalid');
    DOMHandling.RemoveMessage(container);
    DOMHandling.ResetContainer(container);

    if (!onlyDigits.test(inputField.value) & (code === 'BE')) {
      APIRequirementsNotMet(
        container,
        inputField,
        vatButton,
        parent,
        'Le champ doit uniquement contenir des chiffres'
      );
      return;
    }
    if (container.classList.contains('demand') && inputField.value.length > 10) {
      APIRequirementsNotMet(
        container,
        inputField,
        vatButton,
        parent,
        'La longueur du champ doit être de 10 caractères concernant les entreprises belges'
      );
      return;
    } else if (!inputField.value || inputField.value.length < 10) {
      APIRequirementsNotMet(
        container,
        inputField,
        vatButton,
        parent,
        'La longueur du champ doit être de minimum 10 caractères'
      );
      return;
    }

    DisplayLoader(container);

    if (code === 'BE') {
      APIurl = `https://demoapi.cbe2json.be/?cbe=${inputField.value}`;
      IsEU = false;
    } else {
      APIurl = `https://controleerbtwnummer.eu/api/validate/${code}${inputField.value}.json`;
      IsEU = true;
    }

    if (alreadyInsertedVAT === inputField.value) {
      // if wrong supplier selected by the user, reconstruct HTML without API call
      new DOMHandling(APIGlobalresponse, container);
      HideLoader(container);
      return;
    }

    const req = new AjaxRequest(APIurl, container);
    FetchDataCompany(req, container);
  });
});

function DisplayLoader(parent) {
  const currentLoader = parent.querySelector('.loader');
  currentLoader.classList.add('active');
}

function HideLoader(parent) {
  const currentLoader = parent.querySelector('.loader.active');
  currentLoader.classList.remove('active');
}

function APIRequirementsNotMet(container, inputField, vatButton, parent, message) {
  DOMHandling.AddMessage(container, message, 'danger');
  inputField.classList.remove('valid');
  inputField.classList.add('invalid');
  addShakeAnimation(vatButton);
  parent.querySelector('input').focus();
}

function FetchDataCompany(req, parent) {
  req
    .fetchData()
    .then((res) => {
      if (!res.ok) {
        throw new Error(res.json());
      }
      return res.json();
    })
    .then((enterprise) => {
      alreadyInsertedVAT = enterprise.enterpriseNumber || enterprise.vatNumber;
      alreadyInsertedVAT = alreadyInsertedVAT.replace(/\./g, '');
      APIGlobalresponse = enterprise;
      new DOMHandling(enterprise, parent);
    })
    .catch((e) => {
      DOMHandling.AddMessage(parent, 'Aucun résultat', 'danger');
    })
    .finally(() => {
      HideLoader(parent);
    });
}

document.querySelector('.vat-number input').focus();
