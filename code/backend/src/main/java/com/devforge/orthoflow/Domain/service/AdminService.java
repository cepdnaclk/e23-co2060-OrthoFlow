package com.devforge.orthoflow.Domain.service;

import com.devforge.orthoflow.Application.dto.request.CreateUserDto;
import com.devforge.orthoflow.Domain.entity.user.User;
import com.devforge.orthoflow.Domain.entity.user.UserProfile;
import com.devforge.orthoflow.External.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
@Transactional
public class AdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User createUser(CreateUserDto createUserDto) {

        UserProfile profile = new UserProfile();
        profile.setFirstName(createUserDto.getFirstName());
        profile.setLastName(createUserDto.getLastName());
        profile.setEmail(createUserDto.getEmail());
        profile.setPhone(createUserDto.getPhone());
        profile.setNic(createUserDto.getNic());

        User user = new User();
        user.setUsername(createUserDto.getUsername());
        user.setPassword(passwordEncoder.encode(createUserDto.getPassword()));
        user.setRole(createUserDto.getRole());
        user.setProfile(profile); // link profile to user

        return userRepository.save(user); // cascades to save profile
    }
}