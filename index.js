const eyes = document.querySelector(".password .fa-solid.fa-eye-slash")
eyes.addEventListener("click", (e) => {
  const currentEl = e.currentTarget
  const previousEl = currentEl.previousElementSibling
  if (previousEl.type === "password") {
    previousEl.type = "text"
    currentEl.classList.replace("fa-eye-slash", "fa-eye")
  } else {
    previousEl.type = "password"
    currentEl.classList.replace("fa-eye", "fa-eye-slash")
  }
})


const closeBtn = document.querySelector(".close")
const header = document.querySelector("header")
closeBtn.addEventListener("click", () => {
  header.classList.add("hidden")
})

