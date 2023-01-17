package com.teamride.messenger.client.controller;

import javax.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import com.teamride.messenger.client.config.Constants;
import com.teamride.messenger.client.dto.ChatRoomDTO;
import com.teamride.messenger.client.repository.ChatRoomRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RequiredArgsConstructor
@RequestMapping(value = "/chat")
@Slf4j
@RestController
public class RoomController {

    private final ChatRoomRepository chatRoomRepository;
    private final HttpSession httpSession;

    @GetMapping(value = "/getRoomList")
    public Flux<ChatRoomDTO> rooms() {
        log.info("# All Chat Rooms");
        int userId = (int) httpSession.getAttribute(Constants.LOGIN_SESSION);
        return chatRoomRepository.findAllRooms(userId);
    }

    @PostMapping(value = "/room")
    public Mono<ChatRoomDTO> create(@RequestBody ChatRoomDTO room) {
        return chatRoomRepository.createChatRoomDTO(room)
            .doOnSuccess(r -> log.info("# Create Chat Room :: {}", r));
    }

    @GetMapping(value = "/room")
    public Mono<ChatRoomDTO> getRoom(String roomId) {
        return chatRoomRepository.getRoom(roomId)
            .doOnSuccess(r -> log.info("get Chat Room dto:: {}", r));
    }

    @PostMapping("/change-room-img")
    public ResponseEntity<?> chageRoomImg(@RequestPart(required = false, value = "file") MultipartFile multipartFile, String roomId) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        if (multipartFile != null) {
            builder.part("file", multipartFile.getResource());
        }
        builder.part("roomId", roomId);

        String fileName = WebClient.builder()
            .baseUrl(Constants.FILE_SERVER_URL)
            .build()
            .post()
            .uri("/change-room-img")
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .accept(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromMultipartData(builder.build()))
            .retrieve()
            .onStatus(HttpStatus::is4xxClientError, e -> Mono.error(new HttpClientErrorException(e.statusCode())))
            .onStatus(HttpStatus::is5xxServerError, e -> Mono.error(new HttpServerErrorException(e.statusCode())))
            .bodyToMono(String.class)
            .block();

        return ResponseEntity.ok(fileName);
    }
}
