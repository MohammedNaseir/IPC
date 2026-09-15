import 'server-only';

// Errors whose message is safe to show to the signed-in user. Anything else is logged and replaced with a generic message.
export class UserFacingError extends Error {}

export class AuthorizationError extends UserFacingError {
  constructor(message = 'غير مصرح لك بتنفيذ هذا الإجراء.') {
    super(message);
  }
}

export class NotFoundError extends UserFacingError {
  constructor(message = 'السجل المطلوب غير موجود أو لا تملك صلاحية الوصول إليه.') {
    super(message);
  }
}

export class ValidationError extends UserFacingError {}
