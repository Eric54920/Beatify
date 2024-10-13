package beatify

// 标准化的响应
func NewResponse(ststus int, msg string, data interface{}) Response {
	return Response{
		Status: ststus,
		Msg:    msg,
		Data:   data,
	}
}
