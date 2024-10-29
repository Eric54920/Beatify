package beatify

import (
	"net/url"
	"path"
)

// 拼接URL
func JoinUrl(baseURL, relativePath string) (string, error) {
	// 解析基本 URL
	u, err := url.Parse(baseURL)
	if err != nil {
		return "", err
	}

	// 使用 path.Join 拼接路径
	u.Path = path.Join(u.Path, relativePath)

	return u.String(), nil
}
