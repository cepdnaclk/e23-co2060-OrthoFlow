package com.devforge.orthoflow.Domain.service;

import com.devforge.orthoflow.Application.dto.request.LoginRequestDto;
import com.devforge.orthoflow.Application.dto.response.LoginResponseDto;
import com.devforge.orthoflow.External.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
@Service
@Transactional
public class AuthService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthenticationManager authenticationManager;

    public LoginResponseDto login(LoginRequestDto loginRequestDto) {
        Boolean userPresent = isUserEnable(loginRequestDto.getUserName());
        if (!userPresent) return new LoginResponseDto(null , null , "User Not Found" , "Error");
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(loginRequestDto.getUserName(), loginRequestDto.getPassword()));
        }catch (Exception e){
            return new LoginResponseDto(null , null , "Invalid" , "Error");
        }

        return new LoginResponseDto("token" , LocalDateTime.now() , null,"token generated");
    }

    private Boolean isUserEnable(String userName){
        return userRepository.findByUsername(userName).isPresent();
    }
}
