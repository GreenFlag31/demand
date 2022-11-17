// Concerns the input type Range
const result = document.querySelector("#result")
const bar = document.querySelector("#bar")

result.value = bar.value + " %"

bar.addEventListener("input", () => {
  result.textContent = bar.value + " %"
})



// Drag & Drop zone
const inputFile = document.querySelector(".drop-zone-input")
const dropZone = inputFile.closest(".drop-zone")


Drop("change", inputFile)
Drop("dragover")
Drop("dragleave", undefined, false)
Drop("dragend", undefined, false)
Drop("drop", undefined, false)


function Drop(type, eventTarget = dropZone, addClass = true) {
  eventTarget.addEventListener(type, e => {
    e.preventDefault()
    if (addClass) {
      dropZone.classList.add("drop-zone-over")
    } else {
      dropZone.classList.remove("drop-zone-over")
    }

    const currentFile = e.dataTransfer?.files || e.currentTarget.files
    if (currentFile.length) {
      inputFile.files = currentFile
      updateThumbnail(currentFile[0])
    }
  })
}

function updateThumbnail(file) {
  let thumbnailElement = dropZone.querySelector(".drop-zone-thumb")
  dropZone.querySelector(".drop-zone-prompt").classList.add("hidden")

  if (!thumbnailElement) {
    thumbnailElement = document.createElement("div")
    thumbnailElement.classList.add("drop-zone-thumb")
    dropZone.appendChild(thumbnailElement)
  }

  thumbnailElement.dataset.label = file.name.toLowerCase()

  if (file.type.includes("image")) {

    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = () => {
      thumbnailElement.style.background = `url('${reader.result}') center / contain rgb(255, 255, 255) no-repeat`
    }
  } else {
    thumbnailElement.style.backgroundImage = ""
  }
}


const documents = document.querySelector(".documents")
const description = document.querySelector(".content.description input")
const uploadBtn = document.querySelector(".upload button")
uploadBtn.addEventListener("click", () => {
  UploadedDocument()
})

function UploadedDocument() {
  const zoneThumb = document.querySelector(".drop-zone-thumb")

  if (!description || !zoneThumb) {
    addShakeAnimation(uploadBtn)
    return
  }


  const uploaded = document.createElement("div")
  const icon = document.createElement("i")
  icon.classList.add("fa-solid", "fa-check")
  uploaded.classList.add("uploaded-container")
  const doc = document.createElement("p")
  doc.textContent = zoneThumb.dataset.label.toLowerCase()
  uploaded.appendChild(doc)
  uploaded.insertBefore(icon, doc)
  documents.appendChild(uploaded)

  zoneThumb?.remove()
  description.value = ""
  dropZone.querySelector(".drop-zone-prompt").classList.remove("hidden")
}


function addShakeAnimation(element) {
  element.classList.add("shake")
  setTimeout(() => {
    element.classList.remove("shake")
  }, 500);
}





// API fetching and handling
let APIurl = ""
let IsEU = false
let APIGlobalresponse = ""
let alreadyInsertedVAT = ""


class AjaxRequest {
  constructor() {
    this.url = APIurl
  }

  fetchData() {
    return fetch(this.url)
  }
}




class DOMHandling {
  #name
  #VATNumber
  #street

  constructor(APIres, parentContainer) {
    this.APIres = APIres
    this.parentContainer = parentContainer
    this.DOMConstruction()
  }


  DOMConstruction() {

    if (IsEU) {
      this.EUSupplier(this.APIres)
      
    } else {
      this.BESupplier(this.APIres)
      
      this.APIres.establishments.forEach(establishment => {
        this.BESupplier(establishment)
      })
    }
    

    let delay = 0
    const keyframes = [
      { opacity: 0 },
      { opacity: 1 }
    ]

    const results = this.parentContainer.querySelectorAll(".result")
    results.forEach(result => {
      result.animate(keyframes, {     
        duration: 600,
        easing: "ease-out",
        fill: "forwards",
        delay
      })
      delay += 300

      this.addSelectable(results, result)
    })
  }
  
  
  BESupplier(object) {
    const resultContainer = this.parentContainer.querySelector(".result-container")
    if (object.statusDescription && object.statusDescription?.FR !== "Actif") {
      DOMHandling.AddMessage(resultContainer, "Client non valide", "danger")
      return
    }

    const objectAddress = object.addresses[0]
    if (this.#street === this.LimitFieldLength(objectAddress.streetFR)) return
    
    const ojectDenomination = object.denominations[0]
    this.#VATNumber ||= object.enterpriseNumber
    this.#name ||= this.Capitalize(this.LimitFieldLength(ojectDenomination.denomination))
    const establishmentNumber = object.establishmentNumber ? `<p>N° établissement : ${object.establishmentNumber}</p>` : ""

    this.#street = this.LimitFieldLength(objectAddress.streetFR)
    const { houseNumber, zipcode } = objectAddress

    this.DOMInsertion(resultContainer, this.#name, undefined, this.#street, houseNumber, zipcode, this.#VATNumber, establishmentNumber)
  }

  EUSupplier(object) {
    // NL862399373B01
    const resultContainer = document.querySelector(".supplier .result-container")
    if (!object.valid) {
      DOMHandling.AddMessage(resultContainer, "TVA non valide pour les transactions transfrontières dans l’UE", "danger")
      return
    }

    const objectAddress = object.address
    const name = this.Capitalize(this.LimitFieldLength(object.name.toLowerCase()))
    const { countryCode, street, number, zip_code } = objectAddress
    const { vatNumber } = object

    this.DOMInsertion(resultContainer, name, countryCode, street, number, zip_code, vatNumber)
  }



  DOMInsertion(resultContainer, name, countryCode = "BE", street, houseNumber, zipcode, VATNumber, establishmentNumber = "") {
    DOMHandling.AddMessage(resultContainer, "Sélectionnez pour confirmer", "info")

    resultContainer.insertAdjacentHTML("beforeend", `<div class='result'>
    <div class='intro'><p>Nom : ${name}</p>
    <span>${countryCode}</span></div>
    <p>Adresse : ${street} ${houseNumber} ${zipcode}</p>
    <p>N° TVA : ${VATNumber}</p>
    ${establishmentNumber}
    </div>`)
  }


  static AddMessage(resultContainer, message, type) {
    if (document.querySelector("[class*='message-']")) return

    resultContainer.insertAdjacentHTML("beforeend", `<div class='message-${type}'>
    <p>${message}</p></div>`)

    const parentMessage = document.querySelector(`.message-${type}`)
    const icon = document.createElement("i")
    if (type === "danger") {
      icon.classList.add("fa-solid", "fa-triangle-exclamation")
    } else {
      icon.classList.add("fa-solid", "fa-circle-info")
    }
    parentMessage.insertBefore(icon, parentMessage.querySelector("p"))
  }

  static RemoveMessage(container = "") {
    this.parentContainer?.querySelector("[class*='message-']")?.remove() || container.querySelector("[class*='message-']")?.remove()
  }

  static ResetContainer(container) {
    container.querySelectorAll(`.result`)?.forEach(result => {
      result.remove()
    })  
  }

  LimitFieldLength(field, limit = 20) {
    if (field.indexOf("(") !== -1) {
      field = field.substring(0, field.indexOf("("))
    }
  
    if (field.length > limit) {
      let splittedField = field.split(" ")
      field = splittedField[0] + " "
      let i = 1
      while(field.length + splittedField[i]?.length < limit && splittedField[i]) {
        field += splittedField[i] + " "
        i++
      }
  
      if (!splittedField[i]) return field
      field += splittedField[i].trim()[0] + "."
    }
    return field
  }

  Capitalize(field) {
    const word = field.split(" ")
    let capitalized = ""
    let i = 0
    while(word[i]) {
      capitalized += word[i][0].toUpperCase() + word[i].substring(1).toLowerCase() + " "
      i++
    }

    return capitalized.trim()
  }


  addSelectable(results, result) {
    result.addEventListener("click", () => {
      result.classList.add("selected")
      DOMHandling.RemoveMessage(this.parentContainer)


      results.forEach(r => {
        if (!r.classList.contains("selected")) {
          r.classList.add("hidden")
        }
      })
    })
  }
}




const vatButtons = document.querySelectorAll(".vat-number-container button")
vatButtons.forEach(vatButton => {
  vatButton.addEventListener("click", async () => {
    const parent  = vatButton.closest(".vat-number-container")
    let inputField = parent.querySelector("input").value
    // Sanitize spaces and . character
    inputField = inputField.replace(/\s|\./g, "")

    if (!inputField) {
      addShakeAnimation(vatButton)
      parent.querySelector("input").focus()
      return
    }

    const container = parent.parentNode
    DOMHandling.RemoveMessage(container)
    DOMHandling.ResetContainer(container)
    DisplayLoader(container)

    const code = document.querySelector(".prefix select").value
    if (code === "BE") {
      APIurl = `https://demoapi.cbe2json.be/?cbe=${inputField}`
      IsEU = false
    } else {
      APIurl = `https://controleerbtwnummer.eu/api/validate/${code}${inputField}.json`
      IsEU = true
    }

    if (alreadyInsertedVAT === inputField) {
      // if wrong supplier selected by the user, reconstruct HTML without API call
      new DOMHandling(APIGlobalresponse, container)
      HideLoader(container)
      return
    }

    const req = new AjaxRequest(APIurl, container)
    FetchDataCompany(req, container)
  })
})


function DisplayLoader(parent) {
  const currentLoader = parent.querySelector(".loader")
  currentLoader.classList.add("active")
}

function HideLoader(parent) {
  const currentLoader = parent.querySelector(".loader.active")
  currentLoader.classList.remove("active")
}



function FetchDataCompany(req, parent) {

  req.fetchData().then(res => {
    if (!res.ok) {
      throw new Error(res)
    }
    return res.json()
  })
  .then(enterprise => {
    alreadyInsertedVAT = enterprise.enterpriseNumber.replace(/\./g, "")
    APIGlobalresponse = enterprise
    new DOMHandling(enterprise, parent)
  })
  .catch(e => {
    console.log(e)
  })
  .finally(() => {
    HideLoader(parent)
  })
}


document.querySelector(".vat-number input").focus()
