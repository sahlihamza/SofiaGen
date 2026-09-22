const request = require("supertest");
const app = require("../src/index");

describe("Health Check", () => {
  it("should return 200 on root", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toEqual(200);
  });
});