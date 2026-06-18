FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY Backend/ .
RUN go build -o server .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
COPY Widgets/ ./Widgets/
COPY Backend/migrations/ ./migrations/
EXPOSE 8080
CMD ["./server"]
