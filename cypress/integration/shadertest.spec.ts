/// <reference types="Cypress" />

describe("shader test", () => {
  it("should pass all browser tests", function() {
    expect(true).to.equal(true);
    cy.visit("http://localhost:8080/browser/shadertest.html")
      .wait(500)
      .get(".failures").find("em").contains(0);
  })
})