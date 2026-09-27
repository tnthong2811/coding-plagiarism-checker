import { ApiError } from "../api/client";

const DEFAULT_ERROR_MESSAGE = "Đã xảy ra lỗi. Vui lòng thử lại.";

function valueFromObject(value: unknown, keys: string[]) {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const next = record[key];
    if (typeof next === "string" && next.trim()) {
      return next.trim();
    }
  }
  return null;
}

function stripTechnicalPrefix(message: string) {
  return message
    .replace(/^\d{3}\s+[A-Za-z ]+\s+@\s*\S+\s+-\s*/i, "")
    .replace(/^\d{3}\s+[A-Za-z ]+\s*-\s*/i, "")
    .replace(/^\d{3}\s+[A-Za-z ]+$/i, "")
    .trim();
}

function extractRawMessage(error: unknown) {
  if (error instanceof ApiError) {
    return (
      valueFromObject(error.responseBody, ["error", "message", "detail"]) ||
      (typeof error.responseBody === "string" ? error.responseBody : "") ||
      error.message ||
      `${error.status} ${error.statusText}`
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return valueFromObject(error, ["error", "message", "detail"]) || "";
}

function statusMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return null;
  }

  if (error.status === 400) {
    return "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.";
  }
  if (error.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (error.status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (error.status === 404) {
    return "Không tìm thấy dữ liệu được yêu cầu.";
  }
  if (error.status >= 500) {
    return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
  }

  return null;
}

function mappedMessage(rawMessage: string) {
  const message = stripTechnicalPrefix(rawMessage);
  const normalized = message.toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized.includes("email already registered") || normalized.includes("email exists")) {
    return "Email đã tồn tại. Vui lòng dùng email khác hoặc đăng nhập.";
  }
  if (normalized.includes("username exists")) {
    return "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.";
  }
  if (normalized.includes("invalid credentials")) {
    return "Tên đăng nhập hoặc mật khẩu không đúng.";
  }
  if (normalized.includes("password reset required")) {
    return "Tài khoản này cần đặt lại mật khẩu trước khi đăng nhập.";
  }
  if (normalized.includes("password reset is not required")) {
    return "Tài khoản này không cần đặt lại mật khẩu.";
  }
  if (normalized.includes("password must be at least 6 characters")) {
    return "Mật khẩu phải có ít nhất 6 ký tự.";
  }
  if (normalized.includes("password is required")) {
    return "Vui lòng nhập mật khẩu.";
  }
  if (normalized.includes("passwords do not match")) {
    return "Mật khẩu xác nhận không khớp.";
  }
  if (normalized.includes("temporary password is required")) {
    return "Vui lòng nhập mật khẩu tạm thời.";
  }
  if (normalized.includes("email is invalid")) {
    return "Email không hợp lệ.";
  }
  if (normalized.includes("email is required")) {
    return "Vui lòng nhập email.";
  }
  if (normalized.includes("email or username is required")) {
    return "Vui lòng nhập email hoặc tên đăng nhập.";
  }
  if (normalized.includes("username is required")) {
    return "Vui lòng nhập tên đăng nhập.";
  }
  if (normalized.includes("username must be 2-60 characters")) {
    return "Tên đăng nhập phải dài từ 2 đến 60 ký tự.";
  }
  if (normalized.includes("user not found")) {
    return "Không tìm thấy tài khoản này.";
  }
  if (normalized.includes("cannot delete your own account")) {
    return "Bạn không thể xóa chính tài khoản đang đăng nhập.";
  }
  if (normalized.includes("not authenticated") || normalized.includes("missing token")) {
    return "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.";
  }
  if (normalized.includes("reset link is invalid")) {
    return "Liên kết đặt lại mật khẩu không hợp lệ.";
  }
  if (normalized.includes("reset link has expired")) {
    return "Liên kết đặt lại mật khẩu đã hết hạn.";
  }
  if (normalized.includes("reset token is required")) {
    return "Thiếu mã đặt lại mật khẩu.";
  }
  if (normalized.includes("avatar image is too large")) {
    return "Ảnh đại diện quá lớn.";
  }
  if (normalized.includes("avatar image format is not supported")) {
    return "Định dạng ảnh đại diện không được hỗ trợ.";
  }
  if (normalized.includes("avatar url is too long")) {
    return "Đường dẫn ảnh đại diện quá dài.";
  }
  if (normalized.includes("avatar url is invalid")) {
    return "Đường dẫn ảnh đại diện không hợp lệ.";
  }
  if (normalized.includes("avatar url must be http or https")) {
    return "Đường dẫn ảnh đại diện phải bắt đầu bằng http hoặc https.";
  }
  if (normalized.includes("class code already exists")) {
    return "Mã lớp đã tồn tại. Vui lòng chọn mã khác.";
  }
  if (normalized.includes("class code is required")) {
    return "Vui lòng nhập mã lớp.";
  }
  if (normalized.includes("class code must be 3-32 characters")) {
    return "Mã lớp phải dài 3-32 ký tự và chỉ gồm chữ, số, dấu gạch dưới hoặc gạch nối.";
  }
  if (normalized.includes("class name is required")) {
    return "Vui lòng nhập tên lớp.";
  }
  if (normalized.includes("classroom not found")) {
    return "Không tìm thấy lớp học.";
  }
  if (normalized.includes("classroom is required")) {
    return "Vui lòng chọn lớp học.";
  }
  if (normalized.includes("classroom is outside your scope") || normalized.includes("classroom is outside your management scope")) {
    return "Bạn không có quyền truy cập hoặc quản lý lớp học này.";
  }
  if (normalized.includes("assignment not found")) {
    return "Không tìm thấy bài tập.";
  }
  if (normalized.includes("assignment is required")) {
    return "Vui lòng chọn bài tập.";
  }
  if (normalized.includes("assignment deadline has passed")) {
    return "Bài tập đã quá hạn nộp.";
  }
  if (normalized.includes("assignment is outside your scope") || normalized.includes("assignment is outside your management scope")) {
    return "Bạn không có quyền truy cập hoặc quản lý bài tập này.";
  }
  if (normalized.includes("not enrolled in this assignment classroom")) {
    return "Bạn chưa tham gia lớp của bài tập này.";
  }
  if (normalized.includes("file is empty")) {
    return "Tệp tải lên đang trống. Vui lòng chọn tệp hợp lệ.";
  }
  if (normalized.includes("failed to upload to minio") || normalized.includes("unexpected upload failure")) {
    return "Không thể tải tệp lên. Vui lòng thử lại sau.";
  }
  if (normalized.includes("unsupported language")) {
    return "Ngôn ngữ bài tập không được hỗ trợ. Vui lòng chọn AUTO, JAVA hoặc CPP.";
  }
  if (normalized.includes("report not found")) {
    return "Không tìm thấy báo cáo.";
  }
  if (normalized.includes("report is outside your scope")) {
    return "Bạn không có quyền truy cập báo cáo này.";
  }

  if (/^forbidden$/i.test(message)) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (/^unauthorized$/i.test(message)) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  return message || null;
}

export function getFriendlyErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE) {
  const raw = extractRawMessage(error);
  return mappedMessage(raw) || statusMessage(error) || fallback;
}
