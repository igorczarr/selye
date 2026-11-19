import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveUserRole,
  canAccessRole,
  getRequiredRoleForPath,
  canAccessPath,
} from "./rbac";

describe("Phase 1 - RBAC Role Resolution & Route Protection", () => {
  it("atribui papel 'athlete' por padrão quando não há metadados de privilégio", () => {
    assert.equal(resolveUserRole({ email: "atleta@selye.app" }), "athlete");
  });

  it("reconhece 'admin' via publicMetadata.role ou allowlist de e-mail", () => {
    assert.equal(
      resolveUserRole({
        email: "igorsantos979.is@gmail.com",
        metadataRole: "athlete",
      }),
      "admin"
    );
    assert.equal(
      resolveUserRole({
        email: "gestor@selye.app",
        metadataRole: "admin",
      }),
      "admin"
    );
  });

  it("reconhece 'coach' via claim/metadata ou vínculo na tabela coaches", () => {
    assert.equal(
      resolveUserRole({
        email: "treinador@selye.app",
        claimRole: "coach",
      }),
      "coach"
    );
    assert.equal(
      resolveUserRole({
        email: "headcoach@selye.app",
        isRegisteredCoach: true,
      }),
      "coach"
    );
  });

  it("bloqueia atleta comum de acessar /admin e /coach", () => {
    assert.equal(canAccessPath("/treinos", "athlete"), true);
    assert.equal(canAccessPath("/coach", "athlete"), false);
    assert.equal(canAccessPath("/admin", "athlete"), false);
  });

  it("permite que coach acesse /coach mas bloqueia /admin", () => {
    assert.equal(canAccessPath("/coach", "coach"), true);
    assert.equal(canAccessPath("/coach/programas", "coach"), true);
    assert.equal(canAccessPath("/admin", "coach"), false);
  });

  it("permite que admin acesse /admin, /coach e todas as rotas de atleta", () => {
    assert.equal(getRequiredRoleForPath("/admin"), "admin");
    assert.equal(getRequiredRoleForPath("/coach"), "coach");
    assert.equal(canAccessRole("admin", "admin"), true);
    assert.equal(canAccessRole("admin", "coach"), true);
    assert.equal(canAccessRole("admin", "athlete"), true);
    assert.equal(canAccessPath("/admin", "admin"), true);
    assert.equal(canAccessPath("/coach", "admin"), true);
  });
});
