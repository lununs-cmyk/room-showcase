import {
  error,
  getRoom,
  json,
  validateMessage,
  validateRole,
} from "./_shared.js";

export async function onRequestGet(context) {
  try {
    const result = await getRoom(context.request, context.env);
    if (result.response) return result.response;

    const url = new URL(context.request.url);
    const after = Math.max(
      0,
      Number.parseInt(url.searchParams.get("after") || "0", 10) || 0
    );

    const messages = await context.env.DB.prepare(`
      SELECT id, sender_role, content, created_at
      FROM messages
      WHERE room_id = ? AND id > ?
      ORDER BY id ASC
      LIMIT 100
    `).bind(result.roomId, after).all();

    const roomState = await context.env.DB.prepare(`
      SELECT message_limit, message_count, status
      FROM rooms
      WHERE id = ?
    `).bind(result.roomId).first();

    return json({
      success: true,
      messages: messages.results || [],
      room: roomState,
    });
  } catch (cause) {
    console.error("messages GET error", cause);
    return error("SERVER_ERROR", "새 메시지를 불러오지 못했습니다.", 500);
  }
}

async function releaseReservedSlot(env, roomId) {
  try {
    await env.DB.prepare(`
      UPDATE rooms
      SET
        message_count = CASE
          WHEN message_count > 0 THEN message_count - 1
          ELSE 0
        END,
        status = 'open'
      WHERE id = ?
    `).bind(roomId).run();
  } catch (cause) {
    console.error("failed to release reserved message slot", cause);
  }
}

export async function onRequestPost(context) {
  try {
    let payload;

    try {
      payload = await context.request.json();
    } catch {
      return error("INVALID_JSON", "요청 본문이 올바른 JSON이 아닙니다.", 400);
    }

    const result = await getRoom(
      context.request,
      context.env,
      payload.room?.trim()
    );

    if (result.response) return result.response;

    if (!validateRole(payload.senderRole)) {
      return error(
        "INVALID_SENDER_ROLE",
        "현재 입력자를 다시 선택하세요.",
        400
      );
    }

    const valid = validateMessage(payload.content);
    if (!valid.ok) {
      return error("INVALID_MESSAGE", valid.message, 400);
    }

    // 남은 메시지 슬롯 1개를 먼저 원자적으로 예약합니다.
    // 조건을 만족하는 경우에만 message_count가 증가하므로
    // 동시에 여러 요청이 들어와도 message_limit을 넘지 않습니다.
    const reservedRoom = await context.env.DB.prepare(`
      UPDATE rooms
      SET
        message_count = message_count + 1,
        status = CASE
          WHEN message_count + 1 >= message_limit THEN 'closed'
          ELSE 'open'
        END
      WHERE id = ?
        AND status = 'open'
        AND message_count < message_limit
      RETURNING message_limit, message_count, status
    `).bind(result.roomId).first();

    if (!reservedRoom) {
      return error(
        "CHAT_LIMIT_REACHED",
        "대화 가능 횟수를 모두 사용했습니다.",
        409
      );
    }

    try {
      const inserted = await context.env.DB.prepare(`
        INSERT INTO messages (room_id, sender_role, content, created_at)
        VALUES (?, ?, ?, ?)
        RETURNING id, sender_role, content, created_at
      `).bind(
        result.roomId,
        payload.senderRole,
        valid.content,
        new Date().toISOString()
      ).first();

      return json({
        success: true,
        message: inserted,
        room: reservedRoom,
      }, 201);
    } catch (cause) {
      // 메시지 저장이 실패하면 앞서 예약한 횟수를 되돌립니다.
      await releaseReservedSlot(context.env, result.roomId);
      throw cause;
    }
  } catch (cause) {
    console.error("messages POST error", cause);
    return error("SERVER_ERROR", "메시지를 전송하지 못했습니다.", 500);
  }
}
