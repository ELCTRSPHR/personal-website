// Minimal local static file server for previewing the site at http://localhost:8080
#define _CRT_SECURE_NO_WARNINGS
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>

#ifdef _WIN32
  #include <winsock2.h>
  #include <ws2tcpip.h>
  #pragma comment(lib, "ws2_32.lib")
  typedef SOCKET sock_t;
  #define CLOSESOCK closesocket
#else
  #include <arpa/inet.h>
  #include <netinet/in.h>
  #include <sys/socket.h>
  #include <unistd.h>
  typedef int sock_t;
  #define INVALID_SOCKET (-1)
  #define CLOSESOCK close
#endif

const int PORT = 8080;

std::string mimeType(const std::string& path) {
    auto ends = [&](const char* ext) {
        std::string e(ext);
        return path.size() >= e.size() && path.compare(path.size() - e.size(), e.size(), e) == 0;
    };
    if (ends(".html")) return "text/html; charset=utf-8";
    if (ends(".css"))  return "text/css; charset=utf-8";
    if (ends(".js"))   return "application/javascript; charset=utf-8";
    if (ends(".png"))  return "image/png";
    if (ends(".jpg") || ends(".jpeg")) return "image/jpeg";
    if (ends(".gif"))  return "image/gif";
    if (ends(".svg"))  return "image/svg+xml";
    if (ends(".webp")) return "image/webp";
    if (ends(".ico"))  return "image/x-icon";
    if (ends(".pdf"))  return "application/pdf";
    return "application/octet-stream";
}

void sendAll(sock_t s, const std::string& data) {
    size_t sent = 0;
    while (sent < data.size()) {
        int n = send(s, data.data() + sent, (int)(data.size() - sent), 0);
        if (n <= 0) return;
        sent += n;
    }
}

void handleClient(sock_t client) {
    char buf[4096] = {0};
    int n = recv(client, buf, sizeof(buf) - 1, 0);
    if (n <= 0) { CLOSESOCK(client); return; }

    std::istringstream req(buf);
    std::string method, path;
    req >> method >> path;

    // strip query string, default to index.html, block "../" tricks
    size_t q = path.find('?');
    if (q != std::string::npos) path = path.substr(0, q);
    if (path == "/" || path.empty()) path = "/index.html";
    if (path.find("..") != std::string::npos) path = "/index.html";

    std::string file = path.substr(1);
    std::ifstream in(file, std::ios::binary);
    std::ostringstream res;

    if (in) {
        std::ostringstream body;
        body << in.rdbuf();
        std::string content = body.str();
        res << "HTTP/1.1 200 OK\r\n"
            << "Content-Type: " << mimeType(file) << "\r\n"
            << "Content-Length: " << content.size() << "\r\n"
            << "Connection: close\r\n\r\n"
            << content;
        std::cout << "  200  " << path << "\n";
    } else {
        std::string msg = "<h1 style='font-family:sans-serif;color:#d4af37;background:#070707'>404 - Not found</h1>";
        res << "HTTP/1.1 404 Not Found\r\nContent-Type: text/html\r\n"
            << "Content-Length: " << msg.size() << "\r\nConnection: close\r\n\r\n" << msg;
        std::cout << "  404  " << path << "\n";
    }
    sendAll(client, res.str());
    CLOSESOCK(client);
}

int main() {
#ifdef _WIN32
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) { std::cerr << "WSAStartup failed\n"; return 1; }
#endif
    sock_t server = socket(AF_INET, SOCK_STREAM, 0);
    if (server == INVALID_SOCKET) { std::cerr << "Could not create socket\n"; return 1; }

    int opt = 1;
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);   // only reachable from this computer
    addr.sin_port = htons(PORT);

    if (bind(server, (sockaddr*)&addr, sizeof(addr)) < 0 || listen(server, 16) < 0) {
        std::cerr << "Port " << PORT << " is already in use.\n";
        return 1;
    }

    std::cout << "Serving on http://localhost:" << PORT << " (Ctrl+C to stop)\n";

#ifdef _WIN32
    system("start http://localhost:8080");
#elif __APPLE__
    system("open http://localhost:8080");
#endif

    while (true) {
        sock_t client = accept(server, nullptr, nullptr);
        if (client == INVALID_SOCKET) continue;
        handleClient(client);
    }
}
