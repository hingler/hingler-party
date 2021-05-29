/// <reference types="Cypress" />

describe("file loader test", () => {
  it("should pass all browser tests", function() {
    expect(true).to.equal(true);
    cy.visit("http://localhost:8080/browser/simpletest.html")
      .wait(500)
      .get(".failures").find("em").contains(0);
  })
})