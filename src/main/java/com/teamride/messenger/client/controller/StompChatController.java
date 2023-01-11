package com.teamride.messenger.client.controller;

import javax.annotation.Resource;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import ch.qos.logback.core.util.FileUtil;
import com.teamride.messenger.client.config.Constants;
import org.apache.tomcat.util.http.fileupload.FileUtils;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.SendResult;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.util.FileCopyUtils;
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

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.FileSystem;
import java.nio.file.Files;
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

    @PostMapping(value = "/downFile", consumes = MediaType.APPLICATION_JSON_VALUE)
    public void downFile(@RequestBody ChatMessageDTO msg, HttpServletResponse rsp){
        File file = new File("C:\\Users\\minja\\Desktop\\koreaITMessenger\\messenger_client\\src\\main\\resources\\static\\img\\loading.gif");
        try (ServletOutputStream outputStream = rsp.getOutputStream();
             BufferedInputStream in = new BufferedInputStream(new FileInputStream(file))){

            String mimeType = "application/octet-stream";
            rsp.setContentType(mimeType);
            rsp.setContentLengthLong(file.length());
            rsp.setHeader("Content-Disposition","arrachment;filename=" + file.getName());

//            byte[] buffer = new byte[4096];
//            int byteRead = -1;
            FileCopyUtils.copy(in, outputStream);
            outputStream.flush();
            log.info(":::::: 일단 여기까지는 돌았음!! ::::::");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
