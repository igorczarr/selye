import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isContentVisibleBetween,
  validateReportInput,
  type BlockRelation,
} from "./moderation-rules";

describe("Phase 2 - Moderation & Privacy Rules (§11.5)", () => {
  test("Autor sempre visualiza seu próprio conteúdo mesmo com bloqueios alheios", () => {
    const blocks: BlockRelation[] = [{ blockerId: "user-B", blockedId: "user-A" }];
    const visible = isContentVisibleBetween("user-A", "user-A", blocks);
    assert.equal(visible, true);
  });

  test("Conteúdo é invisível se o leitor bloqueou o autor", () => {
    const blocks: BlockRelation[] = [{ blockerId: "viewer-1", blockedId: "author-2" }];
    const visible = isContentVisibleBetween("author-2", "viewer-1", blocks);
    assert.equal(visible, false);
  });

  test("Conteúdo é invisível se o autor bloqueou o leitor", () => {
    const blocks: BlockRelation[] = [{ blockerId: "author-2", blockedId: "viewer-1" }];
    const visible = isContentVisibleBetween("author-2", "viewer-1", blocks);
    assert.equal(visible, false);
  });

  test("Conteúdo é visível quando não há vínculos de bloqueio mútuo", () => {
    const blocks: BlockRelation[] = [{ blockerId: "other-user", blockedId: "author-2" }];
    const visible = isContentVisibleBetween("author-2", "viewer-1", blocks);
    assert.equal(visible, true);
  });

  test("Validação de denúncia rejeita alvo vazio ou motivo excessivamente curto", () => {
    const emptyTarget = validateReportInput({
      targetType: "post",
      targetId: "   ",
      reason: "Spam indevido",
    });
    assert.equal(emptyTarget.isValid, false);

    const emptyReason = validateReportInput({
      targetType: "comment",
      targetId: "comment-123",
      reason: "x",
    });
    assert.equal(emptyReason.isValid, false);

    const valid = validateReportInput({
      targetType: "user",
      targetId: "user-999",
      reason: "Conteúdo tóxico ou desrespeito esportivo",
    });
    assert.equal(valid.isValid, true);
  });
});