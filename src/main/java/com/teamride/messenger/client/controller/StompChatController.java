package com.teamride.messenger.client.controller;

import javax.annotation.Resource;
import javax.servlet.http.HttpSession;

import com.teamride.messenger.client.config.Constants;
import org.springframework.http.*;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.SendResult;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.concurrent.ListenableFuture;
import org.springframework.web.bind.annotation.*;

import com.teamride.messenger.client.config.KafkaConstants;
import com.teamride.messenger.client.dto.ChatMessageDTO;
import com.teamride.messenger.client.dto.ChatRoomDTO;
import com.teamride.messenger.client.repository.ChatRoomRepository;
import com.teamride.messenger.client.service.StompChatService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;

@EnableAsync
@RestController
@RequiredArgsConstructor
@Slf4j
public class StompChatController {

    @Resource(name = "stompChatService")
    private StompChatService stompChatService;

    private final ChatRoomRepository chatRoomRepository;

    private final KafkaTemplate<String, ChatMessageDTO> kafkaTemplate;

    private final HttpSession httpSession;

    @MessageMapping("/chat/input")
    public void chatInput(ChatMessageDTO messageDTO) {
        kafkaTemplate.send(KafkaConstants.CHAT_INPUT, messageDTO); // 순서 보장 필요없을 듯, partition 100개로 RR(Round Robin)
    }

    @KafkaListener(topics = KafkaConstants.CHAT_INPUT, groupId = KafkaConstants.GROUP_ID)
    public void listenInput(ChatMessageDTO chatMessageDTO, Acknowledgment ack) {
        log.info("Received Msg chat-input {}", chatMessageDTO);

        try {
            stompChatService.sendChatInput(chatMessageDTO);
            ack.acknowledge();
        } catch (Exception e) {
            log.error("error::{}", e);
        }
    }

    @MessageMapping(value = "/chat/message")
    public void message(ChatMessageDTO message) {
        log.info("::: StompChatController.message in :::" + message);
        // view에서 message 보내기 누르면 들어옴
        // service 호출
        String partitionKey = message.getRoomId()
            .substring(0, 2);
        ListenableFuture<SendResult<String, ChatMessageDTO>> future = kafkaTemplate.send(KafkaConstants.CHAT_SERVER,
                partitionKey, message);

        future.addCallback((result) -> {
            int partition = result.getRecordMetadata()
                .partition();
            log.info("message 전송 성공, message :: {}, partition num is {},  result is :: {}", message, partition, result);
        }, (ex) -> {
            log.error("message 전송 실패, message :: {}, error is :: {}", message, ex);
        });
    }

    @KafkaListener(topics = KafkaConstants.CHAT_CLIENT, groupId = KafkaConstants.GROUP_ID)
    public void listen(ChatMessageDTO message, Acknowledgment ack) {
        log.info("Received Msg chat-client " + message);

        // message 받음
        // 사용자들이 room id를 구독하고 있어서
        // room id 에대한 user id 조회 logic 필요 없음
        try {
            stompChatService.sendMessage(message);
            log.info("message:::" + message);

            Mono<ChatRoomDTO> monoChatRoomDTO = chatRoomRepository.findRoomById(message.getRoomId());
            monoChatRoomDTO.subscribe(room -> {
                log.info("chatRoom DTO::" + room);
                stompChatService.sendMessageRoomList(room);
            });
            ack.acknowledge();
        } catch (Exception e) {
            log.error("error::{}", e);
        }
    }

    @PostMapping(value = "/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> fileUpload(@RequestPart(value = "files", required = false) List<MultipartFile> files, ChatMessageDTO msg){
        log.info("client server file receive ::::");
        MultiValueMap<String, Object> map = new LinkedMultiValueMap<>();
        map.add("msg",msg);
        files.forEach(file -> map.add("files", file.getResource()));
        log.info("가나요~~~");
        Integer successCnt = WebClient.builder()
                .baseUrl(Constants.FILE_SERVER_URL)
                .build()
                .post()
                .uri("/messege-file")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .accept(MediaType.APPLICATION_JSON)
                .body(BodyInserters.fromMultipartData(map))
                .retrieve()
                .onStatus(HttpStatus::is4xxClientError, e -> Mono.error(new HttpClientErrorException(e.statusCode())))
                .onStatus(HttpStatus::is5xxServerError, e -> Mono.error(new HttpServerErrorException(e.statusCode())))
                .bodyToMono(Integer.class)
                .block();
        log.info("왔나요~~~");
        return ResponseEntity.ok(successCnt);
    }

    @GetMapping(value = "/downFile/{roomId}/{msg}")
    public ResponseEntity<?> downFile(@PathVariable String roomId, @PathVariable String msg){
        String uri = "/downFile/" + roomId + "/" + msg;
        String fileName = msg.substring(msg.lastIndexOf("|") + 1);

        org.springframework.core.io.Resource rsp = WebClient.builder().baseUrl(Constants.FILE_SERVER_URL)
                .codecs(cfg -> cfg.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build()
                .get()
                .uri(uri)
                .accept(MediaType.APPLICATION_OCTET_STREAM)
                .retrieve()
                .onStatus(HttpStatus::is4xxClientError, e -> Mono.error(new HttpClientErrorException(e.statusCode())))
                .onStatus(HttpStatus::is5xxServerError, e -> Mono.error(new HttpServerErrorException(e.statusCode())))
                .bodyToMono(org.springframework.core.io.Resource.class)
                .block();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=" + fileName)
                .body(rsp);
    }
}
