package beatify

// 标准化的响应
func NewResponse(status int, data interface{}) Response {
	return Response{
		Status: status,
		Data:   data,
	}
}
