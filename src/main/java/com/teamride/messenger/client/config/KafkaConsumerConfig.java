package com.teamride.messenger.client.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import com.teamride.messenger.client.dto.ChatMessageDTO;

@EnableKafka
@Configuration
public class KafkaConsumerConfig {

	@Bean
	public Map<String, Object> gerProps() {
		// com.teamride.messenger.server.dto.ChatMessageDTO;
		// package com.teamride.messenger.client.dto.ChatMessageDTO;
		// 경로가 다르기 때문에 역직렬화 시 같은 Entity로 인식을 못함
		// package 경로까지 보기 떄문인데 addTrustedPackages를 해줌으로서 해결
		JsonDeserializer<ChatMessageDTO> deserializer = new JsonDeserializer<>(ChatMessageDTO.class);
		deserializer.setRemoveTypeHeaders(false);
		deserializer.addTrustedPackages("*");
		deserializer.setUseTypeMapperForKey(true);

		Map<String, Object> props = new HashMap<>();
		props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, KafkaConstants.KAFKA_BROKER);
		props.put(ConsumerConfig.GROUP_ID_CONFIG, KafkaConstants.GROUP_ID);
		props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
		props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, deserializer);
		props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
		return props;
	}

	@Bean
	public KafkaConsumer<String, ChatMessageDTO> consumer() {
		return new KafkaConsumer<>(gerProps());
	}

//    @Bean
//    public ConcurrentKafkaListenerContainerFactory<String, ChatMessageDTO> kafkaListenerContainerFactory() {
//        ConcurrentKafkaListenerContainerFactory<String, ChatMessageDTO> factory = new ConcurrentKafkaListenerContainerFactory<>();
//        factory.setConsumerFactory(consumerFactory());
//        return factory;
//    }
}
