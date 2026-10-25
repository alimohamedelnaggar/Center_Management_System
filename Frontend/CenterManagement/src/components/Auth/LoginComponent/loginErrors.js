const CODE_MAP = {
  USER_INACTIVE: {
    variant: "warning",
    title: "الحساب غير مُفعّل",
    message: "حسابك غير مُفعّل حالياً. تواصل مع إدارة السنتر لتفعيله.",
  },
  USER_DISABLED: {
    variant: "warning",
    title: "الحساب غير مُفعّل",
    message: "حسابك غير مُفعّل حالياً. تواصل مع إدارة السنتر لتفعيله.",
  },
  CENTER_SUSPENDED: {
    variant: "danger",
    title: "السنتر موقوف",
    message: "تم إيقاف السنتر مؤقتاً. تواصل مع إدارة المنصة.",
  },
  CENTER_DISABLED: {
    variant: "danger",
    title: "السنتر موقوف",
    message: "تم إيقاف السنتر مؤقتاً. تواصل مع إدارة المنصة.",
  },
  SUBSCRIPTION_EXPIRED: {
    variant: "warning",
    title: "انتهى الاشتراك",
    message: "انتهى اشتراك السنتر، تواصل مع إدارة المنصة.",
  },
  CENTER_EXPIRED: {
    variant: "warning",
    title: "انتهى الاشتراك",
    message: "انتهى اشتراك السنتر، تواصل مع إدارة المنصة.",
  },
};

function extractCode(body) {
  if (!body || typeof body !== "object") return null;

  if (typeof body.code === "string") return body.code;
  if (typeof body.errorCode === "string") return body.errorCode;

  if (Array.isArray(body.errors)) {
    const known = body.errors.find(
      (item) => typeof item === "string" && CODE_MAP[item],
    );
    if (known) return known;
  }

  return null;
}

export function mapLoginError(error) {
  if (error?.isNetworkError || error?.status == null) {
    return {
      variant: "info",
      title: "تعذّر الاتصال بالخادم",
      message: "تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.",
      retry: true,
    };
  }

  const { status, body } = error;
  const message = (body?.message || error.message || "").trim();

  const code = extractCode(body);
  if (code && CODE_MAP[code]) return { ...CODE_MAP[code] };

  if (status >= 500) {
    return {
      variant: "danger",
      title: "خطأ في الخادم",
      message: "حدث خطأ غير متوقع في الخادم. حاول مرة أخرى بعد قليل.",
      retry: true,
    };
  }

  if (status === 429) {
    return {
      variant: "warning",
      title: "محاولات كثيرة",
      message: "لقد حاولت تسجيل الدخول مرات عديدة. انتظر قليلاً ثم أعد المحاولة.",
    };
  }

  if (status === 400 && message.includes("غير مسجل")) {
    return {
      variant: "danger",
      title: "حساب غير موجود",
      message: "هذا الحساب غير مسجل. تأكد من رقم الهاتف أو تواصل مع إدارة السنتر.",
    };
  }

  if (status === 400 || status === 401 || status === 403) {
    return {
      variant: "danger",
      title: "تعذّر تسجيل الدخول",
      message: message || "كلمة المرور أو رقم الهاتف غير صحيح.",
    };
  }

  return {
    variant: "danger",
    title: "تعذّر تسجيل الدخول",
    message: message || "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.",
  };
}
