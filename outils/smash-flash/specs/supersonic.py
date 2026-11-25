SPEC = dict(
    name='Super Sonic', sheet='SuperSonicFinalGIF.gif', credit='Joe the EchidnaFox', region=(0, 0, 583, 770),
    extra_bg=[(248, 248, 248)], gap=1, sounds='Super Sonic', height=58,
    anims=dict(
        idle=['1.1', '1.2'], walk=['0.2', '0.3'], run=['0.4', '0.5'], crouch=['1.2'], jumpSquat=['1.2'],
        jump=['0.3'], doubleJump='2.4-2.11', fall=['0.4'], land=['1.2'],
        shield=['1.7'], dodge=['0.1'], roll='4.0-4.5', hurt=['12.6'], hurtAir=['12.8'], tumble=['12.9', '12.10'],
        lie=['12.11'], getup=['1.2'], taunt='0.8-0.11', win=['0.9'],
        jab=['5.0', '5.1'], ftilt=['5.3', '5.4', '5.5'], utilt=['6.0', '6.3'], dtilt=['6.1', '6.2'], dash=['7.0', '7.1'],
        fsmash=['7.9', '7.10', '7.11'], usmash=['14.0', '14.2'], dsmash=['8.4', '8.5'],
        nair='2.0-2.3', fair=['7.3', '7.4', '7.5'], uair=['14.3', '14.8'], dair='16.1-16.5',
        neutralB=['1.3', '1.5', '1.6'], sideB='9.1-9.3', upB='11.0-11.5', downB=['19.3', '19.6'],
        grab=['6.3', '6.4'],
    ),
    times=dict(idle=12, walk=8, run=6, doubleJump=3, roll=3, nair=3, upB=3, taunt=8),
    moves=dict(upB=dict(vy=-10, helpless=True), sideB=dict(vx=8, hit=dict(dmg=12)), downB=dict(hit=dict(dmg=16, bkb=40))),
    stats=dict(weight=92, walkSpeed=2.0, runSpeed=4.6, jumpForce=9.2, doubleJumpForce=8.6, jumps=3, gravity=0.36),
)
